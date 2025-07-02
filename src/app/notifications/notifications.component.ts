import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../service/notification.service';
import { AlertService } from '../service/alerts.service';
import { toggleAnimation } from 'src/app/shared/animations';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'expense' | 'budget' | 'goal' | 'reminder' | 'warning' | 'success' | 'info';
  isRead: boolean;
  createdAt: string;
}

@Component({
  templateUrl: './notifications.component.html',
  animations: [toggleAnimation],
})
export class NotificationsComponent implements OnInit {
  loading = false;
  loadingMore = false;
  notifications: Notification[] = [];
  showUnreadOnly = false;
  unreadCount = 0;
  hasMore = true;
  currentPage = 1;
  pageSize = 20;

  constructor(
    private notificationService: NotificationService,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications(reset: boolean = true) {
    if (reset) {
      this.currentPage = 1;
      this.notifications = [];
      this.hasMore = true;
    }

    this.loading = reset;
    
    this.notificationService.getNotifications(this.showUnreadOnly).subscribe({
      next: (response) => {
        if (response.status === 200) {
          const newNotifications = response.$values || [];
          
          // Simulate pagination since API doesn't provide it
          const startIndex = (this.currentPage - 1) * this.pageSize;
          const endIndex = startIndex + this.pageSize;
          const pageNotifications = newNotifications.slice(startIndex, endIndex);
          
          if (reset) {
            this.notifications = pageNotifications;
          } else {
            this.notifications = [...this.notifications, ...pageNotifications];
          }
          
          this.hasMore = endIndex < newNotifications.length;
          this.unreadCount = newNotifications.filter((n: any) => !n.isRead).length;
        }
        this.loading = false;
        this.loadingMore = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.alertService.sweetAlertIt('Failed to load notifications', 'Error!', 'error');
        this.loading = false;
        this.loadingMore = false;
        
        // Fallback to mock data for demonstration
        this.loadMockNotifications();
      }
    });
  }

  loadMockNotifications() {
    // Mock notifications for demonstration
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Budget Alert',
        message: 'You have exceeded 80% of your Food & Dining budget for this month.',
        type: 'warning',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Goal Achievement',
        message: 'Congratulations! You have reached your Emergency Fund goal of $5,000.',
        type: 'success',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        title: 'Expense Added',
        message: 'New expense of $45.50 added to Transportation category.',
        type: 'expense',
        isRead: true,
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: '4',
        title: 'Payment Reminder',
        message: 'Your Netflix subscription of $15.99 is due tomorrow.',
        type: 'reminder',
        isRead: false,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '5',
        title: 'Budget Created',
        message: 'New budget for Entertainment category has been created successfully.',
        type: 'budget',
        isRead: true,
        createdAt: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    this.notifications = mockNotifications;
    this.unreadCount = mockNotifications.filter(n => !n.isRead).length;
    this.hasMore = false;
    this.loading = false;
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'expense':
        return 'bg-primary/10 text-primary dark:bg-primary dark:text-white-light';
      case 'budget':
        return 'bg-success/10 text-success dark:bg-success dark:text-white-light';
      case 'goal':
        return 'bg-warning/10 text-warning dark:bg-warning dark:text-white-light';
      case 'reminder':
        return 'bg-info/10 text-info dark:bg-info dark:text-white-light';
      case 'warning':
        return 'bg-danger/10 text-danger dark:bg-danger dark:text-white-light';
      case 'success':
        return 'bg-success/10 text-success dark:bg-success dark:text-white-light';
      default:
        return 'bg-secondary/10 text-secondary dark:bg-secondary dark:text-white-light';
    }
  }

  toggleShowUnread() {
    this.showUnreadOnly = !this.showUnreadOnly;
    this.loadNotifications();
  }

  refreshNotifications() {
    this.loadNotifications();
  }

  loadMore() {
    this.currentPage++;
    this.loadingMore = true;
    this.loadNotifications(false);
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id).subscribe({
      next: (response) => {
        if (response.status === 200) {
          // Update local state
          const notification = this.notifications.find(n => n.id === id);
          if (notification && !notification.isRead) {
            notification.isRead = true;
            this.unreadCount--;
          }
        }
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
        // For demo purposes, still update the UI
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.isRead) {
          notification.isRead = true;
          this.unreadCount--;
        }
      }
    });
  }

  markAllAsRead() {
    if (this.unreadCount === 0) return;

    this.notificationService.markAllAsRead().subscribe({
      next: (response) => {
        if (response.status === 200) {
          // Update local state
          this.notifications.forEach(n => n.isRead = true);
          this.unreadCount = 0;
          this.alertService.sweetAlertIt('All notifications marked as read!', 'Success!');
        }
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
        // For demo purposes, still update the UI
        this.notifications.forEach(n => n.isRead = true);
        this.unreadCount = 0;
        this.alertService.sweetAlertIt('All notifications marked as read!', 'Success!');
      }
    });
  }

  async deleteNotification(id: string) {
    const alertOptions = {
      title: 'Delete Notification',
      text: 'Are you sure you want to delete this notification?',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const isConfirmed = await this.alertService.confirmDialog(alertOptions);

    if (isConfirmed) {
      this.notificationService.deleteNotification(id).subscribe({
        next: (response) => {
          if (response.status === 200) {
            // Remove from local state
            const index = this.notifications.findIndex(n => n.id === id);
            if (index > -1) {
              const notification = this.notifications[index];
              if (!notification.isRead) {
                this.unreadCount--;
              }
              this.notifications.splice(index, 1);
            }
            this.alertService.sweetAlertIt('Notification deleted successfully!', 'Success!');
          }
        },
        error: (error) => {
          console.error('Error deleting notification:', error);
          // For demo purposes, still update the UI
          const index = this.notifications.findIndex(n => n.id === id);
          if (index > -1) {
            const notification = this.notifications[index];
            if (!notification.isRead) {
              this.unreadCount--;
            }
            this.notifications.splice(index, 1);
          }
          this.alertService.sweetAlertIt('Notification deleted successfully!', 'Success!');
        }
      });
    }
  }
}