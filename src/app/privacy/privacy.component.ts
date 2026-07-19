import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent implements OnInit {
  constructor(private loaderService: LoaderService) {}

  ngOnInit(): void {
    this.loaderService.markReady();
  }
}
