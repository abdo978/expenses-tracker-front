import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';
import { CategoriesComponent } from './categories.component';

const routes: Routes = [
    { path: '', component: CategoriesComponent, data: { title: 'Categories' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        CategoriesComponent,
    ],
})
export class CategoriesModule {}