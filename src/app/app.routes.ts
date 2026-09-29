import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { GameComponent } from './game/game.component';
import { SupportComponent } from './support/support.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { PacksComponent } from './packs/packs.component';
import { PackComponent } from './pack/pack.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'play', component: GameComponent },
  { path: 'packs', component: PacksComponent },
  { path: 'pack/:packId', component: PackComponent },
  { path: 'pack/:packId/:n', component: GameComponent },
  { path: 'support', component: SupportComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: '**', redirectTo: '' }
];