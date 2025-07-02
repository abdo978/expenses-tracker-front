import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';
import { ExpensesComponent } from './expenses-list.component';

const routes: Routes = [
    { path: '', component: ExpensesComponent, data: { title: 'Expenses' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        ExpensesComponent,
    ],
})
export class ExpensesModule {}