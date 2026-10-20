import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { firstValueFrom } from 'rxjs';
import { BRUSSELS_MUNICIPALITIES, BRUSSELS_MUNICIPALITY_CENTERS } from '../../shared/constants/municipalities';
import { Listing, ListingStatus } from '../../shared/models/listing.model';
import { ListingCard, ListingPatch } from '../listing-card/listing-card';

const BRUSSELS: L.LatLngTuple = [50.8466, 4.3528];

const PIN_CLASSES: Record<ListingStatus, { bg: string; border: string }> = {
  pending: { bg: 'bg-blue-600', border: 'border-blue-600' },
  oui: { bg: 'bg-emerald-600', border: 'border-emerald-600' },
  peutetre: { bg: 'bg-amber-500', border: 'border-amber-500' },
  non: { bg: 'bg-gray-500', border: 'border-gray-500' },
};

@Component({
  selector: 'app-listings-map',
  standalone: true,
  imports: [ListingCard],
  template: `
    <div #map class="absolute inset-0"></div>
    @if (selected) {
      <div class="absolute bottom-2.5 right-2.5 w-80 max-h-[calc(100%-1.25rem)] flex flex-col gap-2 z-[1000]">
        <div class="min-h-0 overflow-y-auto rounded-xl">
          <app-listing-card [listing]="selected" [mode]="selected.removedAt ? 'removed' : selected.status" (statusChange)="statusChange.emit($event)" (mergeRequest)="mergeRequest.emit($event)"
            (historyOpen)="historyOpen.emit($event)" (listingChange)="listingChange.emit($event)" />
        </div>
        @if (group.length) {
          <div class="flex items-center justify-between rounded-lg bg-white shadow px-1 py-1 text-sm text-gray-700">
            <button type="button" class="w-7 h-7 rounded hover:bg-gray-100 cursor-pointer" title="Précédente" (click)="step(-1)"><i class="far fa-chevron-left"></i></button>
            <span>{{ communeName(selected.postalCode) }} {{ group.indexOf(selected) + 1 }}/{{ group.length }}</span>
            <button type="button" class="w-7 h-7 rounded hover:bg-gray-100 cursor-pointer" title="Suivante" (click)="step(1)"><i class="far fa-chevron-right"></i></button>
          </div>
        }
      </div>
    }
  `,
})
export class ListingsMap implements AfterViewInit, OnDestroy {
  @ViewChild('map') mapElement!: ElementRef<HTMLDivElement>;

  private _listings: Listing[] = [];

  @Input({ required: true })
  set listings(value: Listing[]) {
    this._listings = value.filter((l) => l.latitude !== null && l.longitude !== null);
    this.unlocated = value.filter((l) => l.latitude === null || l.longitude === null);
    if (this.group.length) {
      const index = this.group.indexOf(this.selected!);
      this.group = this.unlocated.filter((l) => l.postalCode === this.selected!.postalCode);
      this.selected = this.group.find((l) => l.immowebId === this.selected!.immowebId) ?? this.group[Math.min(index, this.group.length - 1)] ?? null;
    } else if (this.selected) {
      this.selected = this._listings.find((l) => l.immowebId === this.selected!.immowebId) ?? null;
    }
    this.render();
  }

  @Output() statusChange = new EventEmitter<{ listing: Listing; status: ListingStatus }>();
  @Output() mergeRequest = new EventEmitter<Listing>();
  @Output() historyOpen = new EventEmitter<Listing>();
  @Output() listingChange = new EventEmitter<{ listing: Listing; patch: ListingPatch }>();

  selected: Listing | null = null;
  group: Listing[] = [];
  private unlocated: Listing[] = [];

  private map?: L.Map;
  private readonly markers = L.layerGroup();
  private fitted = false;
  private resizeObserver?: ResizeObserver;

  constructor(private readonly http: HttpClient) { }

  async ngAfterViewInit(): Promise<void> {
    this.map = L.map(this.mapElement.nativeElement, { zoomControl: false }).setView(BRUSSELS, 13);
    this.markers.addTo(this.map);
    this.map.on('click', (e) => (this.isStreetViewClick(e) ? this.openStreetView(e.latlng) : this.select(null)));
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.mapElement.nativeElement);
    this.render();

    const { cartoApiKey } = await firstValueFrom(this.http.get<{ cartoApiKey: string | null }>('/api/config'));
    const plan = L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoApiKey ? `?key=${encodeURIComponent(cartoApiKey)}` : ''}`, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxNativeZoom: 18,
      maxZoom: 20,
    }).addTo(this.map);
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxNativeZoom: 19,
      maxZoom: 20,
    });
    L.control.layers({ Plan: plan, Satellite: satellite }, undefined, { position: 'topright' }).addTo(this.map);
  }

  private isStreetViewClick(e: L.LeafletMouseEvent): boolean {
    return e.originalEvent.metaKey || e.originalEvent.ctrlKey;
  }

  private openStreetView({ lat, lng }: L.LatLng): void {
    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`, '_blank', 'noopener');
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private select(listing: Listing | null, group: Listing[] = []): void {
    this.selected = listing;
    this.group = group;
    this.render();
  }

  step(offset: number): void {
    const index = (this.group.indexOf(this.selected!) + offset + this.group.length) % this.group.length;
    this.selected = this.group[index];
  }

  communeName(postalCode: string | null): string {
    return (postalCode && BRUSSELS_MUNICIPALITIES[postalCode]) ?? postalCode ?? '';
  }

  private render(): void {
    if (!this.map) return;
    this.markers.clearLayers();
    for (const listing of this._listings) {
      const isSelected = listing.immowebId === this.selected?.immowebId;
      const icon = L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="w-max -translate-x-1/2 -translate-y-full rounded border-2 px-1 py-px text-xs font-bold text-white shadow cursor-pointer ${listing.removedAt ? 'bg-black' : PIN_CLASSES[listing.status].bg} ${PIN_CLASSES[listing.status].border} ${isSelected ? 'ring-2 ring-offset-1 ring-blue-600 scale-110' : ''}">${listing.flagMain === 'under_option' ? '<i class="fas fa-handshake" title="Sous option"></i> ' : ''}${this.formatPrice(listing.price)}</div>`,
      });
      L.marker([listing.latitude!, listing.longitude!], { icon, zIndexOffset: isSelected ? 1000 : 0 })
        .on('click', (e) => (this.isStreetViewClick(e) ? this.openStreetView(e.latlng) : this.select(listing)))
        .addTo(this.markers);
    }
    const unlocatedByPostalCode = new Map<string | null, Listing[]>();
    for (const listing of this.unlocated) {
      unlocatedByPostalCode.set(listing.postalCode, [...(unlocatedByPostalCode.get(listing.postalCode) ?? []), listing]);
    }
    for (const [postalCode, listings] of unlocatedByPostalCode) {
      const center = postalCode && BRUSSELS_MUNICIPALITY_CENTERS[postalCode];
      if (!center) continue;
      const isSelected = this.group.length > 0 && this.selected?.postalCode === postalCode;
      const icon = L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="w-max -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-gray-500 bg-white/90 px-2 py-0.5 text-xs font-semibold text-gray-700 shadow cursor-pointer ${isSelected ? 'ring-2 ring-offset-1 ring-blue-600 scale-110' : ''}" title="Annonces sans adresse précise à ${this.communeName(postalCode)}"><i class="far fa-location-question"></i> ${listings.length} sans adresse</div>`,
      });
      L.marker(center, { icon, zIndexOffset: isSelected ? 1000 : 500 })
        .on('click', () => this.select(listings[0], listings))
        .addTo(this.markers);
    }
    if (!this.fitted && this._listings.length) {
      this.map.fitBounds(L.latLngBounds(this._listings.map((l) => [l.latitude!, l.longitude!])), { padding: [40, 40] });
      this.fitted = true;
    }
  }

  private formatPrice(price: number | null): string {
    return price === null ? '?' : `${Math.round(price / 1000)}K €`;
  }
}
