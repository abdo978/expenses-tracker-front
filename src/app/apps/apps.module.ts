import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';
import { CalendarComponent } from './calendar';

const routes: Routes = [
    { path: '', component: CalendarComponent, data: { title: 'Calendar' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        CalendarComponent,
    ],
})
export class AppsModule {}
