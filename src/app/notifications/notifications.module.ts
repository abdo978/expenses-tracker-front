import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';
import { NotificationsComponent } from './notifications.component';

const routes: Routes = [
    { path: '', component: NotificationsComponent, data: { title: 'Notifications' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        NotificationsComponent,
    ],
})
export class NotificationsModule {}