import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { Apis } from './API';

export interface UpdateUserPreferencesCommand {
  userId: string;
  currency?: string;
  language?: string;
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface UserPreferencesDto {
  userId: string;
  currency?: string;
  language?: string;
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  constructor(private apiService: ApiService) {}

  /**
   * Get user preferences
   * GET /api/users/preferences
   */
  getUserPreferences() {
    return this.apiService.get(`${Apis.user_preferences.get}`);
  }

  /**
   * Update user preferences
   * PUT /api/users/preferences
   */
  updateUserPreferences(preferences: UpdateUserPreferencesCommand) {
    return this.apiService.put(`${Apis.user_preferences.update}`, preferences);
  }

  /**
   * Update currency preference
   */
  updateCurrency(userId: string, currency: string) {
    return this.getUserPreferences().subscribe((currentPrefs: any) => {
      const updatedPrefs: UpdateUserPreferencesCommand = {
        ...currentPrefs,
        userId,
        currency
      };
      return this.updateUserPreferences(updatedPrefs);
    });
  }

  /**
   * Update language preference
   */
  updateLanguage(userId: string, language: string) {
    return this.getUserPreferences().subscribe((currentPrefs: any) => {
      const updatedPrefs: UpdateUserPreferencesCommand = {
        ...currentPrefs,
        userId,
        language
      };
      return this.updateUserPreferences(updatedPrefs);
    });
  }

  /**
   * Toggle dark mode
   */
  toggleDarkMode(userId: string, darkMode: boolean) {
    return this.getUserPreferences().subscribe((currentPrefs: any) => {
      const updatedPrefs: UpdateUserPreferencesCommand = {
        ...currentPrefs,
        userId,
        darkMode
      };
      return this.updateUserPreferences(updatedPrefs);
    });
  }

  /**
   * Update notification preferences
   */
  updateNotificationPreferences(userId: string, emailNotifications: boolean, pushNotifications: boolean) {
    return this.getUserPreferences().subscribe((currentPrefs: any) => {
      const updatedPrefs: UpdateUserPreferencesCommand = {
        ...currentPrefs,
        userId,
        emailNotifications,
        pushNotifications
      };
      return this.updateUserPreferences(updatedPrefs);
    });
  }
}