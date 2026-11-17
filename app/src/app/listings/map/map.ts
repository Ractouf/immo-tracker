import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { firstValueFrom } from 'rxjs';
import { LISTING_STATUSES } from '../../shared/constants/listing-statuses';
import { BRUSSELS_MUNICIPALITIES, BRUSSELS_MUNICIPALITY_CENTERS } from '../../shared/constants/municipalities';
import { Listing, ListingStatus } from '../../shared/models/listing.model';
import { Card, ListingPatch } from '../card/card';

const BRUSSELS: L.LatLngTuple = [50.8466, 4.3528];

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [Card],
  templateUrl: './map.html',
})
export class MapView implements AfterViewInit, OnDestroy {
  @ViewChild('map') mapElement!: ElementRef<HTMLDivElement>;

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

  private readonly markers = L.layerGroup();

  private _listings: Listing[] = [];
  private unlocated: Listing[] = [];
  private map?: L.Map;
  private fitted = false;
  private resizeObserver?: ResizeObserver;

  constructor(private readonly http: HttpClient) { }

  async ngAfterViewInit(): Promise<void> {
    this.map = L.map(this.mapElement.nativeElement, { zoomControl: false, maxZoom: 20 }).setView(BRUSSELS, 13);
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

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  step(offset: number): void {
    const index = (this.group.indexOf(this.selected!) + offset + this.group.length) % this.group.length;
    this.selected = this.group[index];
  }

  communeName(postalCode: string | null): string {
    return (postalCode && BRUSSELS_MUNICIPALITIES[postalCode]) ?? postalCode ?? '';
  }

  private select(listing: Listing | null, group: Listing[] = []): void {
    this.selected = listing;
    this.group = group;
    this.render();
  }

  private render(): void {
    if (!this.map) return;
    this.markers.clearLayers();
    for (const listing of this._listings) {
      const isSelected = listing.immowebId === this.selected?.immowebId;
      const icon = L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<div class="w-max -translate-x-1/2 -translate-y-full rounded border-2 px-1 py-px text-xs font-bold text-white shadow cursor-pointer ${listing.removedAt ? 'bg-black' : LISTING_STATUSES[listing.status].classes.pinBg} ${LISTING_STATUSES[listing.status].classes.pinBorder} ${isSelected ? 'ring-2 ring-offset-1 ring-blue-600 scale-110' : ''}">${listing.flagMain === 'under_option' ? '<i class="fas fa-handshake" title="Sous option"></i> ' : ''}${this.formatPrice(listing.price)}</div>`,
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

  private isStreetViewClick(e: L.LeafletMouseEvent): boolean {
    return e.originalEvent.metaKey || e.originalEvent.ctrlKey;
  }

  private openStreetView({ lat, lng }: L.LatLng): void {
    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`, '_blank', 'noopener');
  }

  private formatPrice(price: number | null): string {
    return price === null ? '?' : `${Math.round(price / 1000)}K €`;
  }
}
