import { Component, Input, OnChanges } from '@angular/core';
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
  imports: [Table],
  templateUrl: './agency-stats.html',
  styleUrl: './agency-stats.scss',
})
export class AgencyStatsView implements OnChanges {
  @Input({ required: true }) stats: AgencyStats[] = [];

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
    this.buildRows();
  }

  private buildRows(): void {
    this.rows = this.stats.map((s) => ({
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
