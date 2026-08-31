import { Injectable } from '@nestjs/common';
import { ImmowebService } from './immoweb.service';
import { FeedbackSentiment, Listing, ListingStatus, SyncSummary } from './listing.model';
import { ListingsStore } from './listings.store';

@Injectable()
export class ListingsService {
  constructor(
    private readonly store: ListingsStore,
    private readonly immoweb: ImmowebService,
  ) { }

  async sync(): Promise<SyncSummary> {
    const now = new Date().toISOString();
    const fetched = await this.immoweb.fetchAllListings();
    const existing = await this.store.readAll();
    const byId = new Map(existing.map((l) => [l.immowebId, l]));
    const seenIds = new Set<number>();

    let nouvelles = 0;
    let misesAJour = 0;

    for (const item of fetched) {
      seenIds.add(item.immowebId);
      const current = byId.get(item.immowebId);

      if (!current) {
        nouvelles += 1;
        byId.set(item.immowebId, {
          ...item,
          priceHistory: item.price !== null ? [{ date: now, price: item.price }] : [],
          firstSeenAt: now,
          lastSeenAt: now,
          updatedAt: now,
          status: 'pending',
          removedAt: null,
          groupId: item.immowebId,
          feedbackSentiment: null,
          feedbackNote: null,
          showcase: false,
          ownerNote: null,
        });
        continue;
      }

      const priceChanged = item.price !== null && item.price !== current.price;
      const reappeared = !!current.removedAt;
      const updated: Listing = {
        ...current,
        title: item.title,
        price: item.price,
        propertyType: item.propertyType,
        subtype: item.subtype,
        locality: item.locality,
        postalCode: item.postalCode,
        bedroomCount: item.bedroomCount,
        netHabitableSurface: item.netHabitableSurface,
        landSurface: item.landSurface,
        pictureUrl: item.pictureUrl,
        flagMain: item.flagMain,
        agencyName: item.agencyName,
        url: item.url,
        lastSeenAt: now,
        updatedAt: priceChanged || reappeared ? now : current.updatedAt,
        removedAt: null,
        priceHistory: priceChanged
          ? [...current.priceHistory, { date: now, price: item.price! }]
          : current.priceHistory,
      };

      if (priceChanged || reappeared) {
        misesAJour += 1;
      }

      byId.set(item.immowebId, updated);
    }

    let disparues = 0;
    for (const listing of byId.values()) {
      if (!seenIds.has(listing.immowebId) && !listing.removedAt) {
        listing.removedAt = now;
        listing.updatedAt = now;
        disparues += 1;
      }
    }

    // Une annonce vendue disparaît des résultats de recherche sans passer par un
    // statut "sold" explicite dans la liste : on va vérifier sa page individuelle
    // pour toute annonce disparue pas encore confirmée vendue (nouvelle ou ancienne).
    const toCheck = Array.from(byId.values()).filter((l) => l.removedAt && l.flagMain !== 'sold');
    await Promise.all(
      toCheck.map(async (listing) => {
        const isSold = await this.immoweb.checkSoldStatus(listing.immowebId);
        if (isSold) {
          listing.flagMain = 'sold';
          listing.updatedAt = now;
        }
      }),
    );

    const all = Array.from(byId.values());
    await this.store.writeAll(all);

    return { nouvelles, misesAJour, disparues, total: all.length };
  }

  async findByStatus(status?: ListingStatus): Promise<Listing[]> {
    const all = await this.store.readAll();
    return this.groupAndRepresent(all)
      .filter((l) => !l.removedAt)
      .filter((l) => (status ? l.status === status : true))
      .sort((a, b) => (b.updatedAt ?? b.firstSeenAt).localeCompare(a.updatedAt ?? a.firstSeenAt));
  }

  async findRemoved(): Promise<Listing[]> {
    const all = await this.store.readAll();
    return this.groupAndRepresent(all)
      .filter((l) => !!l.removedAt)
      .sort((a, b) => (b.removedAt ?? '').localeCompare(a.removedAt ?? ''));
  }

  async update(
    immowebId: number,
    patch: {
      status?: ListingStatus;
      feedbackSentiment?: FeedbackSentiment;
      feedbackNote?: string | null;
      showcase?: boolean;
      ownerNote?: string | null;
    },
  ): Promise<Listing> {
    const all = await this.store.readAll();
    const listing = all.find((l) => l.immowebId === immowebId);
    if (!listing) {
      throw new Error(`Listing ${immowebId} introuvable`);
    }

    const groupId = listing.groupId ?? listing.immowebId;
    for (const member of all) {
      if ((member.groupId ?? member.immowebId) !== groupId) continue;
      // Une fois qu'une annonce du groupe a disparu, elle garde figée la réponse
      // qu'elle avait à ce moment-là : seule l'annonce encore active représente le
      // bien et doit suivre les décisions prises désormais.
      if (member.removedAt) continue;
      if (patch.status !== undefined) member.status = patch.status;
      if (patch.feedbackSentiment !== undefined) member.feedbackSentiment = patch.feedbackSentiment;
      if (patch.feedbackNote !== undefined) member.feedbackNote = patch.feedbackNote;
      if (patch.showcase !== undefined) member.showcase = patch.showcase;
      if (patch.ownerNote !== undefined) member.ownerNote = patch.ownerNote;
    }

    await this.store.writeAll(all);
    return this.groupAndRepresent(all).find((l) => (l.groupId ?? l.immowebId) === groupId)!;
  }

  async merge(keepImmowebId: number, mergeImmowebId: number): Promise<Listing> {
    if (keepImmowebId === mergeImmowebId) {
      throw new Error('Impossible de fusionner une annonce avec elle-même');
    }

    const all = await this.store.readAll();
    const keep = all.find((l) => l.immowebId === keepImmowebId);
    const toMerge = all.find((l) => l.immowebId === mergeImmowebId);
    if (!keep || !toMerge) {
      throw new Error('Annonce introuvable');
    }

    const keepGroupId = keep.groupId ?? keep.immowebId;
    const mergeGroupId = toMerge.groupId ?? toMerge.immowebId;
    if (keepGroupId === mergeGroupId) {
      throw new Error('Ces annonces sont déjà fusionnées');
    }

    // On ne fait que rattacher l'ancienne annonce au groupe : elle garde son propre
    // statut/avis tel qu'il était avant la fusion, pour rester consultable dans
    // l'historique du bien plutôt que d'être écrasé par celui de l'annonce conservée.
    for (const member of all) {
      if ((member.groupId ?? member.immowebId) === mergeGroupId) {
        member.groupId = keepGroupId;
      }
    }
    keep.groupId = keepGroupId;

    await this.store.writeAll(all);
    return this.groupAndRepresent(all).find((l) => (l.groupId ?? l.immowebId) === keepGroupId)!;
  }

  private groupAndRepresent(all: Listing[]): Listing[] {
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
      const active = byRecency.filter((m) => !m.removedAt);
      const representative = active[0] ?? byRecency[0];
      const groupHistory = members
        .filter((m) => m.immowebId !== representative.immowebId)
        .sort((a, b) => a.firstSeenAt.localeCompare(b.firstSeenAt));

      representatives.push(groupHistory.length > 0 ? { ...representative, groupHistory } : representative);
    }

    return representatives;
  }
}
