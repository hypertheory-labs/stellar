import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { HomeComponent } from './home.component';
import { SensitiveDataComponent } from './sensitive-data.component';
import { ProductsComponent } from './products.component';
import { showcaseRoutes } from './showcase/showcase.routes';

export const routes: Routes = [
  { path: '',                component: LandingComponent },
  { path: 'basics',          component: HomeComponent },
  { path: 'sanitize',        component: SensitiveDataComponent },
  { path: 'outbox',          component: ProductsComponent },
  { path: 'ai-collaboration', children: showcaseRoutes },
];
