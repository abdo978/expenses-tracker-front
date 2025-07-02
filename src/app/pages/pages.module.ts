import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';
import { Error404Component } from './error404';

const routes: Routes = [
    { path: 'pages/error404', component: Error404Component, data: { title: 'Error 404' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        Error404Component,
    ],
})
export class PagesModule {}
