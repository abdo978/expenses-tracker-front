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
    templateUrl: './boxed-signup.html',
    animations: [toggleAnimation],
})
export class BoxedSignupComponent {
    store: any;
    registerForm: FormGroup | any;
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
        this.registerForm = this.fb.group({
            firstName: ['', [Validators.required, Validators.minLength(2)]],
            lastName: ['', [Validators.required, Validators.minLength(2)]],
            userName: ['', [Validators.required, Validators.minLength(3)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required]]
        });
    }

    onSubmit() {
        if (this.registerForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        this.isLoading = true;
        const userData = this.registerForm.value;

        this.authService.register(userData).subscribe({
            next: (response) => {
                this.isLoading = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Account created successfully! Please login.',
                    confirmButtonText: 'Go to Login'
                }).then(() => {
                    this.router.navigate(['/auth/signin']);
                });
            },
            error: (error) => {
                this.isLoading = false;
                console.error('Registration failed', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Registration Failed',
                    text: error.error?.message || 'Failed to create account. Please try again.',
                });
            }
        });
    }

    private markFormGroupTouched() {
        Object.keys(this.registerForm.controls).forEach(key => {
            const control = this.registerForm.get(key);
            control?.markAsTouched();
        });
    }

    // Helper methods for template
    isFieldInvalid(fieldName: string): boolean {
        const field = this.registerForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }

    getFieldError(fieldName: string): string {
        const field = this.registerForm.get(fieldName);
        if (field?.errors) {
            if (field.errors['required']) {
                return `${fieldName} is required`;
            }
            if (field.errors['email']) {
                return 'Please enter a valid email address';
            }
            if (field.errors['minlength']) {
                return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
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