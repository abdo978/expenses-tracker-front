import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';
import { BudgetsComponent } from './budget.component';

const routes: Routes = [
    { path: '', component: BudgetsComponent, data: { title: 'Budgets' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        BudgetsComponent,
    ],
})
export class BudgetsModule {}