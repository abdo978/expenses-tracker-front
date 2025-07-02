import { Routes } from '@angular/router';
import { AuthGuard } from './service/auth/auth.guard';
import { LoginGuard } from './service/auth/login.guard';

// dashboard
import { IndexComponent } from './index';

// layouts
import { AppLayout } from './layouts/app-layout';
import { AuthLayout } from './layouts/auth-layout';

// pages
import { Error404Component } from './pages/error404';

export const routes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            // dashboard
            { path: '', component: IndexComponent, data: { title: 'Dashboard' } },

            // Expenses Management
            { path: 'expenses', loadChildren: () => import('./expenses/expenses.module').then((d) => d.ExpensesModule) },

            // Calendar
            { path: 'apps/calendar', loadChildren: () => import('./apps/apps.module').then((d) => d.AppsModule) },

            // Categories Management
            { path: 'categories', loadChildren: () => import('./categories/categories.module').then((d) => d.CategoriesModule) },

            // Budgets Management
            { path: 'budgets', loadChildren: () => import('./budget/budget.module').then((d) => d.BudgetsModule) },

            // Financial Goals Management
            { path: 'financial-goals', loadChildren: () => import('./financial-goals/financial-goals.module').then((d) => d.FinancialGoalsModule) },

            // Notifications
            { path: 'notifications', loadChildren: () => import('./notifications/notifications.module').then((d) => d.NotificationsModule) },

            // Reports & Analytics
            // { path: 'reports', loadChildren: () => import('./reports/reports.module').then((d) => d.ReportsModule) },

            // User Settings & Preferences
            // { path: 'settings', loadChildren: () => import('./settings/settings.module').then((d) => d.SettingsModule) },

            // Profile Management
            { path: 'profile', loadChildren: () => import('./profile/profile.module').then((d) => d.ProfileModule) },
        ],
    },

    {
        path: '',
        component: AuthLayout,
        children: [
            // auth
            { path: '', canActivate: [LoginGuard], loadChildren: () => import('./auth/auth.module').then((d) => d.AuthModule) },
        ],
    },
    {
        path: '**',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: Error404Component, data: { title: 'Page non trouvé' } },
        ],
    },
];