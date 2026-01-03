import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { GameComponent } from './game/game.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'play', component: GameComponent },
  { path: '**', redirectTo: '' }
];