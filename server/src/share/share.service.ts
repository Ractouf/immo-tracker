import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Listing } from '../listings/listing.model';
import { ListingsStore } from '../listings/listings.store';
import { ShareTokenStore } from '../share-token/share-token.store';
import { PublicListing } from './share.model';

@Injectable()
export class ShareService {
  constructor(
    private readonly store: ListingsStore,
    private readonly shareTokenStore: ShareTokenStore,
  ) { }

  async getPublicListings(token: string): Promise<PublicListing[]> {
    await this.checkToken(token);

    const all = await this.store.readAll();
    return this.pickRepresentatives(all)
      .filter((l) => this.isShowable(l))
      .sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt))
      .map((l) => this.toPublicShape(l));
  }

  async submitFeedback(
    token: string,
    immowebId: number,
    patch: { feedbackSentiment?: PublicListing['feedbackSentiment']; feedbackNote?: string | null },
  ): Promise<PublicListing> {
    await this.checkToken(token);

    const all = await this.store.readAll();
    const listing = all.find((l) => l.immowebId === immowebId);
    if (!listing || !this.isShowable(listing)) {
      throw new NotFoundException('Annonce introuvable');
    }

    if (patch.feedbackSentiment !== undefined) listing.feedbackSentiment = patch.feedbackSentiment;
    if (patch.feedbackNote !== undefined) listing.feedbackNote = patch.feedbackNote;

    await this.store.writeAll(all);
    return this.toPublicShape(listing);
  }

  private async checkToken(token: string): Promise<void> {
    const expected = await this.shareTokenStore.getOrCreate();
    if (token !== expected) {
      throw new ForbiddenException('Lien invalide ou expiré');
    }
  }

  private isShowable(l: Listing): boolean {
    return !l.removedAt && (l.status === 'oui' || l.status === 'peutetre') && l.showcase;
  }

  private toPublicShape(l: Listing): PublicListing {
    return {
      immowebId: l.immowebId,
      title: l.title,
      price: l.price,
      locality: l.locality,
      postalCode: l.postalCode,
      bedroomCount: l.bedroomCount,
      netHabitableSurface: l.netHabitableSurface,
      landSurface: l.landSurface,
      pictureUrl: l.pictureUrl,
      flagMain: l.flagMain,
      url: l.url,
      feedbackSentiment: l.feedbackSentiment,
      feedbackNote: l.feedbackNote,
      ownerNote: l.ownerNote,
    };
  }

  private pickRepresentatives(all: Listing[]): Listing[] {
    const groups = new Map<number, Listing[]>();
    for (const listing of all) {
      const key = listing.groupId ?? listing.immowebId;
      const bucket = groups.get(key);
      if (bucket) bucket.push(listing);
      else groups.set(key, [listing]);
    }

    const representatives: Listing[] = [];
    for (const members of groups.values()) {
      const byRecency = [...members].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
      representatives.push(byRecency.find((m) => !m.removedAt) ?? byRecency[0]);
    }
    return representatives;
  }
}
