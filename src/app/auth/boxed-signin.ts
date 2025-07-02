import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { toggleAnimation } from 'src/app/shared/animations';
import { AppService } from 'src/app/service/app.service';
import { AuthService } from 'src/app/service/auth/auth.service';
import Swal from 'sweetalert2';

@Component({
    templateUrl: './boxed-signin.html',
    animations: [toggleAnimation],
})
export class BoxedSigninComponent {
    store: any;
    loginForm: FormGroup | any;
    isLoading = false;

    constructor(
        public translate: TranslateService,
        public storeData: Store<any>,
        public router: Router,
        private appSetting: AppService,
        private authService: AuthService,
        private fb: FormBuilder
    ) {
        this.initStore();
        this.initForm();
    }

    async initStore() {
        this.storeData
            .select((d) => d.index)
            .subscribe((d) => {
                this.store = d;
            });
    }

    initForm() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required]]
        });
    }

    onSubmit() {
        if (this.loginForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        this.isLoading = true;
        const credentials = this.loginForm.value;

        this.authService.login(credentials).subscribe({
            next: (response) => {
                this.isLoading = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Login successful',
                    timer: 1500,
                    showConfirmButton: false
                });
                this.router.navigate(['/']);
            },
            error: (error) => {
                this.isLoading = false;
                console.error('Login failed', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: error.error?.message || 'Invalid email or password. Please try again.',
                });
            }
        });
    }

    private markFormGroupTouched() {
        Object.keys(this.loginForm.controls).forEach(key => {
            const control = this.loginForm.get(key);
            control?.markAsTouched();
        });
    }

    // Helper methods for template
    isFieldInvalid(fieldName: string): boolean {
        const field = this.loginForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }

    getFieldError(fieldName: string): string {
        const field = this.loginForm.get(fieldName);
        if (field?.errors) {
            if (field.errors['required']) {
                return `${fieldName} is required`;
            }
            if (field.errors['email']) {
                return 'Please enter a valid email address';
            }
        }
        return '';
    }

    changeLanguage(item: any) {
        this.translate.use(item.code);
        this.appSetting.toggleLanguage(item);
        if (this.store.locale?.toLowerCase() === 'ae') {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'rtl' });
        } else {
            this.storeData.dispatch({ type: 'toggleRTL', payload: 'ltr' });
        }
        window.location.reload();
    }
}