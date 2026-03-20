import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { SensitiveDataComponent } from './sensitive-data.component';

export const routes: Routes = [
  { path: '',            component: HomeComponent },
  { path: 'sanitize',   component: SensitiveDataComponent },
];
