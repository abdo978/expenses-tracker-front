import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { Apis } from './API';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private apiService: ApiService) {}

  /**
   * Get notifications
   * GET /api/Notifications
   */
  getNotifications(unreadOnly: boolean = false) {
    const queryString = unreadOnly ? '?unreadOnly=true' : '';
    return this.apiService.get(`${Apis.notifications.list}${queryString}`);
  }

  /**
   * Get all notifications
   */
  getAllNotifications() {
    return this.getNotifications(false);
  }

  /**
   * Get only unread notifications
   */
  getUnreadNotifications() {
    return this.getNotifications(true);
  }

  /**
   * Mark notification as read
   * PUT /api/Notifications/{id}/read
   */
  markAsRead(id: string) {
    return this.apiService.put(`${Apis.notifications.mark_read}/${id}/read`, {});
  }

  /**
   * Mark all notifications as read
   * PUT /api/Notifications/read-all
   */
  markAllAsRead() {
    return this.apiService.put(`${Apis.notifications.mark_all_read}`, {});
  }

  /**
   * Delete notification
   * DELETE /api/Notifications/{id}
   */
  deleteNotification(id: string) {
    return this.apiService.delete(`${Apis.notifications.delete}/${id}`);
  }
}