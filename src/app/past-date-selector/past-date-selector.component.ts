import { Component, EventEmitter, Output, OnInit, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule, MatDatepicker, MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { GameService } from '../../services/game.service';
import { StateService } from '../../services/state.service';
import { StatsService } from '../../services/stats.service';

@Component({
  selector: 'app-past-date-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './past-date-selector.component.html',
  styleUrls: ['./past-date-selector.component.scss']
})
export class PastDateSelectorComponent implements OnInit {
  @Input() iconOnly = false;
  @Output() dateSelected = new EventEmitter<Date>();
  @ViewChild('picker') picker!: MatDatepicker<Date>;

  availableDatesSet = new Set<string>(); // keys as YYYY-MM-DD for quick lookup
  selectedDate?: Date;

  private dateStatusMap: Record<string, 'completed' | 'started'> = {};

  constructor(
    private gameService: GameService,
    private stateService: StateService,
    private statsService: StatsService,
  ) {}

  ngOnInit(): void {
    this.gameService.getAvailableDates().subscribe(dates => {
      dates.forEach(d => {
        this.availableDatesSet.add(this.toKey(d));
      });
      this.buildStatusMap(dates);
    });
  }

  private buildStatusMap(dates: Date[]): void {
    const completed = new Set(this.statsService.getResults().map(r => r.date));
    const submissions = this.stateService.loadSubmissions();
    const submitted = new Set(submissions.map(s => s.date).filter(Boolean) as string[]);

    for (const d of dates) {
      const ymd = this.toKey(d);
      const mmddyy = this.toMmddyy(d);

      if (completed.has(mmddyy)) {
        this.dateStatusMap[ymd] = 'completed';
      } else if (
        submitted.has(mmddyy) ||
        this.stateService.loadDateState(mmddyy) !== null ||
        Object.keys(this.stateService.loadInputValues(mmddyy)).length > 0
      ) {
        this.dateStatusMap[ymd] = 'started';
      }
    }
  }

  dateClassFn: MatCalendarCellClassFunction<Date> = (date: Date, view: string): string => {
    if (view !== 'month') return '';
    const status = this.dateStatusMap[this.toKey(date)];
    if (status === 'completed') return 'date-completed';
    if (status === 'started') return 'date-started';
    return '';
  };

  // used by matDatepicker to enable only available dates (and past)
  dateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    const today = this.gameService.getTodayEST();
    // only allow past or today
    if (d > today) return false;
    return this.availableDatesSet.has(this.toKey(d));
  }

  // called when user changes the date in the picker — emit immediately when valid
  onDateChange(date: Date | null): void {
    console.log('Date selected:', date);
    if (!date) { this.selectedDate = undefined; return; }
    const key = this.toKey(date);
    if (this.availableDatesSet.has(key)) {
        console.log('Valid date selected:', date);
      this.selectedDate = date;
      this.dateSelected.emit(date);
    } else {
      // invalid selection — clear
      this.selectedDate = undefined;
    }
  }

  private toKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private toMmddyy(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}${dd}${yy}`;
  }

  openPicker(): void {
    this.picker.open();
  }
}
