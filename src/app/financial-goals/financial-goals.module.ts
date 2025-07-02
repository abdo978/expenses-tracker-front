import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';
import { FinancialGoalsComponent } from './financial-goals.component';

const routes: Routes = [
    { path: '', component: FinancialGoalsComponent, data: { title: 'Financial Goals' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        FinancialGoalsComponent,
    ],
})
export class FinancialGoalsModule {}