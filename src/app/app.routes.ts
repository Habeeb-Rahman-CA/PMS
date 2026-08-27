import { Routes } from '@angular/router';
import { ProjectsComponent } from './features/projects/projects';
import { TasksComponent } from './features/tasks/tasks';
import { MyWorkComponent } from './features/my-work/my-work';

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
    path: 'tasks',
    component: TasksComponent
  },
  {
    path: 'my-work',
    component: MyWorkComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
