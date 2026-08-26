import { Routes } from '@angular/router';
import { ProjectsComponent } from './features/projects/projects';

export const routes: Routes = [
  {
    path: '',
    component: ProjectsComponent
  },
  {
    path: 'projects',
    component: ProjectsComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
