import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';

import { BoxedSigninComponent } from './boxed-signin';
import { BoxedSignupComponent } from './boxed-signup';

const routes: Routes = [
    { path: 'auth/signin', component: BoxedSigninComponent, data: { title: 'Signin' } },
    { path: 'auth/signup', component: BoxedSignupComponent, data: { title: 'Signup' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        BoxedSigninComponent,
        BoxedSignupComponent,
    ],
})
export class AuthModule {}
