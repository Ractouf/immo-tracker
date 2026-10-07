import { Injectable } from '@nestjs/common';
import { ImmowebSearch } from './immoweb-search.model';
import { FetchedListing, ImmowebService } from './immoweb.service';
import { Listing, ListingStatus, SyncSummary } from './listing.model';
import { ListingsStore } from './listings.store';

const SOLD_STATUS_CHECK_CONCURRENCY = 5;

@Injectable()
export class ListingsService {
  constructor(
    private readonly store: ListingsStore,
    private readonly immoweb: ImmowebService,
  ) { }

  async sync(searches: ImmowebSearch[]): Promise<SyncSummary> {
    const now = new Date().toISOString();

    const fetchedById = new Map<number, { item: FetchedListing; searchIds: Set<string> }>();
    for (const search of searches) {
      for (const item of await this.immoweb.fetchAllListings(search)) {
        const entry = fetchedById.get(item.immowebId);
        if (entry) entry.searchIds.add(search.id);
        else fetchedById.set(item.immowebId, { item, searchIds: new Set([search.id]) });
      }
    }

    const existing = await this.store.readAll();
    const byId = new Map(existing.map((l) => [l.immowebId, l]));
    const seenIds = new Set<number>();

    let nouvelles = 0;
    let misesAJour = 0;

    for (const { item, searchIds } of fetchedById.values()) {
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
          toVisit: false,
          ownerNote: null,
          searchIds: [...searchIds],
        });
        continue;
      }

      const lastRecordedPrice = current.priceHistory.at(-1)?.price ?? null;
      const priceChanged = item.price !== null && item.price !== lastRecordedPrice;
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
        peb: item.peb,
        url: item.url,
        lastSeenAt: now,
        updatedAt: priceChanged || reappeared ? now : current.updatedAt,
        removedAt: null,
        searchIds: [...new Set([...(current.searchIds ?? []), ...searchIds])],
        priceHistory: priceChanged
          ? [...current.priceHistory, { date: now, price: item.price! }]
          : current.priceHistory,
      };

      if (priceChanged || reappeared) {
        misesAJour += 1;
      }

      byId.set(item.immowebId, updated);
    }

    const ranSearchIds = new Set(searches.map((s) => s.id));
    let disparues = 0;
    for (const listing of byId.values()) {
      const coveredByThisSync = !listing.searchIds?.length || listing.searchIds.some((id) => ranSearchIds.has(id));
      if (coveredByThisSync && !seenIds.has(listing.immowebId) && !listing.removedAt) {
        listing.removedAt = now;
        listing.updatedAt = now;
        disparues += 1;
      }
    }

    const toCheck = Array.from(byId.values()).filter((l) => l.removedAt && l.flagMain !== 'sold');
    await this.mapWithConcurrency(toCheck, SOLD_STATUS_CHECK_CONCURRENCY, async (listing) => {
      const isSold = await this.immoweb.checkSoldStatus(listing.immowebId);
      if (isSold) {
        listing.flagMain = 'sold';
        listing.updatedAt = now;
      }
    });

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
      toVisit?: boolean;
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
      if (member.removedAt) continue;
      if (patch.status !== undefined) member.status = patch.status;
      if (patch.toVisit !== undefined) member.toVisit = patch.toVisit;
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

    for (const member of all) {
      if ((member.groupId ?? member.immowebId) === mergeGroupId) {
        member.groupId = keepGroupId;
      }
    }
    keep.groupId = keepGroupId;

    await this.store.writeAll(all);
    return this.groupAndRepresent(all).find((l) => (l.groupId ?? l.immowebId) === keepGroupId)!;
  }

  async unmerge(immowebId: number): Promise<void> {
    const all = await this.store.readAll();
    const listing = all.find((l) => l.immowebId === immowebId);
    if (!listing) {
      throw new Error(`Listing ${immowebId} introuvable`);
    }

    const groupId = listing.groupId ?? listing.immowebId;
    const others = all.filter((l) => l !== listing && (l.groupId ?? l.immowebId) === groupId);
    if (others.length === 0) {
      throw new Error("Cette annonce n'est fusionnée avec aucune autre");
    }

    if (groupId === listing.immowebId) {
      const newGroupId = others[0].immowebId;
      for (const member of others) member.groupId = newGroupId;
    }
    listing.groupId = listing.immowebId;

    await this.store.writeAll(all);
  }

  private async mapWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
    const queue = [...items];
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift()!;
        await fn(item);
      }
    });
    await Promise.all(workers);
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
