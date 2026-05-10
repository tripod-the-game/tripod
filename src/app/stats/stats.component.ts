import { Component, EventEmitter, Output, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService, ComputedStats } from '../../services/stats.service';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
})
export class StatsComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  stats!: ComputedStats;
  distributionKeys = ['1', '2', '3', '4', '5+'];

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.stats = this.statsService.getComputedStats();
  }

  maxDistributionCount(): number {
    return Math.max(1, ...Object.values(this.stats.distribution));
  }

  barWidth(key: string): string {
    const pct = (this.stats.distribution[key] / this.maxDistributionCount()) * 100;
    return `${Math.max(pct, 4)}%`;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') this.close.emit();
  }
}
