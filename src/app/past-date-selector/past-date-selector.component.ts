import { Component, EventEmitter, Output, OnInit, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { GameService } from '../../services/game.service';

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

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.gameService.getAvailableDates().subscribe(dates => {
      dates.forEach(d => {
        const key = this.toKey(d);
        this.availableDatesSet.add(key);
      });
    });
  }

  // used by matDatepicker to enable only available dates (and past)
  dateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    const today = new Date();
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

  openPicker(): void {
    this.picker.open();
  }
}