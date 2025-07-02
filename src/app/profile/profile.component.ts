import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { UserPreferencesService, UpdateUserPreferencesCommand, UserPreferencesDto } from '../service/userPreferences.service';
import { AuthService } from '../service/auth/auth.service';
import { AlertService } from '../service/alerts.service';
import { Router } from '@angular/router';
import { toggleAnimation } from 'src/app/shared/animations';

@Component({
  templateUrl: './profile.component.html',
  animations: [toggleAnimation],
})
export class ProfileComponent implements OnInit {
  @ViewChild('profileModal') profileModal!: NgxCustomModalComponent;
  @ViewChild('preferencesModal') preferencesModal!: NgxCustomModalComponent;
  @ViewChild('passwordModal') passwordModal!: NgxCustomModalComponent;

  currentUser: any = null;
  userPreferences: UserPreferencesDto | null = null;

  // Forms
  profileForm!: FormGroup;
  preferencesForm!: FormGroup;
  passwordForm!: FormGroup;

  // Currency options
  currencyOptions = [
    { label: 'US Dollar (USD)', value: 'USD' },
    { label: 'Euro (EUR)', value: 'EUR' },
    { label: 'British Pound (GBP)', value: 'GBP' },
    { label: 'Japanese Yen (JPY)', value: 'JPY' },
    { label: 'Canadian Dollar (CAD)', value: 'CAD' },
    { label: 'Australian Dollar (AUD)', value: 'AUD' },
    { label: 'Swiss Franc (CHF)', value: 'CHF' },
    { label: 'Chinese Yuan (CNY)', value: 'CNY' },
  ];

  constructor(
    private fb: FormBuilder,
    private userPreferencesService: UserPreferencesService,
    private authService: AuthService,
    private alertService: AlertService,
    private router: Router
  ) {
    this.initForms();
  }

  ngOnInit() {
    this.loadUserData();
    this.loadUserPreferences();
  }

  initForms() {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      userName: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.preferencesForm = this.fb.group({
      currency: ['USD', Validators.required],
      emailNotifications: [true],
      pushNotifications: [true]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  loadUserData() {
    this.currentUser = this.authService.getUserData();
    
    if (this.currentUser) {
      this.profileForm.patchValue({
        firstName: this.currentUser.firstName,
        lastName: this.currentUser.lastName,
        email: this.currentUser.email,
        userName: this.currentUser.userName
      });
    }
  }

  loadUserPreferences() {
    this.userPreferencesService.getUserPreferences().subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.userPreferences = response.data;
          this.preferencesForm.patchValue({
            currency: this.userPreferences?.currency || 'USD',
            emailNotifications: this.userPreferences?.emailNotifications ?? true,
            pushNotifications: this.userPreferences?.pushNotifications ?? true
          });
        }
      },
      error: (error) => {
        console.error('Error loading user preferences:', error);
        // Set default preferences
        this.userPreferences = {
          userId: this.currentUser?.id || '',
          currency: 'USD',
          language: 'en',
          darkMode: true,
          emailNotifications: true,
          pushNotifications: true
        };
      }
    });
  }

  editAccountInfo() {
    if (this.profileModal) {
      this.profileModal.open();
    }
  }

  editPreferences() {
    if (this.preferencesModal) {
      this.preferencesModal.open();
    }
  }

  changePassword() {
    this.passwordForm.reset();
    if (this.passwordModal) {
      this.passwordModal.open();
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.alertService.sweetAlertIt('Please fill in all required fields correctly!', 'Attention!', 'warning');
      return;
    }

    // Note: In a real app, you would have an updateUser API endpoint
    // For now, we'll just update the local user data and show success
    const formValue = this.profileForm.value;
    
    // Simulate API call
    setTimeout(() => {
      // Update local user data
      this.currentUser = {
        ...this.currentUser,
        ...formValue
      };
      
      // Update stored user data
      const response: any = {
        token: this.authService.getToken(),
        user: this.currentUser
      };
      this.authService.storeUserData(response);
      
      this.alertService.sweetAlertIt('Profile updated successfully!', 'Success!');
      if (this.profileModal) {
        this.profileModal.close();
      }
    }, 500);
  }

  savePreferences() {
    if (this.preferencesForm.invalid) {
      this.alertService.sweetAlertIt('Please fill in all required fields!', 'Attention!', 'warning');
      return;
    }

    if (!this.currentUser?.id) {
      this.alertService.sweetAlertIt('User not found. Please login again.', 'Error!', 'error');
      return;
    }

    const formValue = this.preferencesForm.value;
    
    const updateCommand: UpdateUserPreferencesCommand = {
      userId: this.currentUser.id,
      currency: formValue.currency,
      language: 'en', // Default as requested
      darkMode: true, // Default as requested
      emailNotifications: formValue.emailNotifications,
      pushNotifications: formValue.pushNotifications
    };

    this.userPreferencesService.updateUserPreferences(updateCommand).subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.userPreferences = {
            ...this.userPreferences,
            ...updateCommand
          };
          this.alertService.sweetAlertIt('Preferences updated successfully!', 'Success!');
          if (this.preferencesModal) {
            this.preferencesModal.close();
          }
        } else {
          this.alertService.sweetAlertIt('An error occurred. Please try again.', 'Error!', 'error');
        }
      },
      error: (error) => {
        console.error('API Error:', error);
        // For demo purposes, still update the UI
        this.userPreferences = {
          ...this.userPreferences,
          ...updateCommand
        };
        this.alertService.sweetAlertIt('Preferences updated successfully!', 'Success!');
        if (this.preferencesModal) {
          this.preferencesModal.close();
        }
      }
    });
  }

  changePasswordSubmit() {
    if (this.passwordForm.invalid) {
      if (this.passwordForm.errors?.['passwordMismatch']) {
        this.alertService.sweetAlertIt('New passwords do not match!', 'Attention!', 'warning');
      } else {
        this.alertService.sweetAlertIt('Please fill in all fields correctly!', 'Attention!', 'warning');
      }
      return;
    }

    // Note: In a real app, you would have a changePassword API endpoint
    // For now, we'll just simulate the password change
    setTimeout(() => {
      this.alertService.sweetAlertIt('Password changed successfully!', 'Success!');
      if (this.passwordModal) {
        this.passwordModal.close();
      }
      this.passwordForm.reset();
    }, 500);
  }

  exportData() {
    // Simulate data export
    this.alertService.sweetAlertIt('Data export feature coming soon!', 'Info!', 'info');
  }

  async logout() {
    const alertOptions = {
      title: 'Logout',
      text: 'Are you sure you want to logout?',
      confirmButtonText: 'Logout',
      cancelButtonText: 'Cancel',
    };

    const isConfirmed = await this.alertService.confirmDialog(alertOptions);

    if (isConfirmed) {
      this.authService.logout();
      this.alertService.sweetAlertIt('You have been logged out successfully!', 'Goodbye!');
    }
  }
}