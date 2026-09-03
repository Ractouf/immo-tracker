import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgencyStats } from '../shared/models/listing.model';
import { Table } from '../shared/table/table';
import { TableCellType } from '../shared/table/table.enum';
import { TableOption } from '../shared/table/table.model';
import { TableAttribute } from '../shared/table/table.type';

interface AgencyRow {
  agencyName: string;
  oui: number;
  peutetre: number;
  non: number;
  avgPrice: number | null;
  total: number;
  municipalityLabels: string[];
}

@Component({
  selector: 'app-agency-stats',
  standalone: true,
  imports: [FormsModule, Table],
  templateUrl: './agency-stats.html',
  styleUrl: './agency-stats.scss',
})
export class AgencyStatsView implements OnChanges {
  @Input({ required: true }) stats: AgencyStats[] = [];

  query = '';
  rows: AgencyRow[] = [];

  readonly options = new TableOption({ pageSizeOptions: [10, 25, 50, 100], initPageSize: 25 });

  readonly attributes: TableAttribute[] = [
    { name: 'agencyName', label: 'Agence', type: TableCellType.Text },
    { name: 'oui', label: 'Oui', type: TableCellType.Number },
    { name: 'peutetre', label: 'Peut-être', type: TableCellType.Number },
    { name: 'non', label: 'Non', type: TableCellType.Number },
    { name: 'avgPrice', label: 'Prix moyen', type: TableCellType.Currency },
    { name: 'total', label: 'Total', type: TableCellType.Number },
    { name: 'municipalityLabels', label: 'Communes', type: TableCellType.Badges, path: 'label', sortable: false },
  ];

  ngOnChanges(): void {
    this.applyFilter();
  }

  onQueryChange(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    const query = this.query.trim().toLowerCase();
    const filtered = !query
      ? this.stats
      : this.stats.filter((s) => {
        if (s.agencyName.toLowerCase().includes(query)) return true;
        return s.municipalities.some((m) => m.locality.toLowerCase().includes(query));
      });

    this.rows = filtered.map((s) => ({
      agencyName: s.agencyName,
      oui: s.oui,
      peutetre: s.peutetre,
      non: s.non,
      avgPrice: s.avgPrice,
      total: s.total,
      municipalityLabels: s.municipalities.map((m) => `${m.locality} (${m.count})`),
    }));
  }
}
