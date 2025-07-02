import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';
import { ProfileComponent } from './profile.component';

const routes: Routes = [
    { path: '', component: ProfileComponent, data: { title: 'Profile' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        ProfileComponent,
    ],
})
export class ProfileModule {}