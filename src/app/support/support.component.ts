import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss'
})
export class SupportComponent implements OnInit {
  constructor(private loaderService: LoaderService) {}

  ngOnInit(): void {
    this.loaderService.markReady();
  }
}
