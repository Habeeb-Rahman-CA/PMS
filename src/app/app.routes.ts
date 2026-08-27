import { Routes } from '@angular/router';
import { ProjectsComponent } from './features/projects/projects';
import { TasksComponent } from './features/tasks/tasks';
import { MyWorkComponent } from './features/my-work/my-work';
import { InboxComponent } from './features/inbox/inbox';

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
    path: 'my-work',
    component: MyWorkComponent
  },
  {
    path: 'inbox',
    component: InboxComponent
  },
  {
    path: 'tasks',
    component: TasksComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
