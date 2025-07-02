export const Apis = {
  // Budget endpoints
  budgets: {
    list: 'api/Budgets',
    create: 'api/Budgets',
    get_by_id: 'api/Budgets',
    update: 'api/Budgets',
    delete: 'api/Budgets',
    by_category: 'api/Budgets/category'
  },

  // Category endpoints
  categories: {
    list: 'api/Categories',
    create: 'api/Categories',
    get_by_id: 'api/Categories',
    update: 'api/Categories',
    delete: 'api/Categories'
  },

  // Expense endpoints
  expenses: {
    list: 'api/Expenses',
    create: 'api/Expenses',
    get_by_id: 'api/Expenses',
    update: 'api/Expenses',
    delete: 'api/Expenses'
  },

  // Financial Goals endpoints
  financial_goals: {
    list: 'api/FinancialGoals',
    create: 'api/FinancialGoals',
    get_by_id: 'api/FinancialGoals',
    update: 'api/FinancialGoals',
    delete: 'api/FinancialGoals',
    add_contribution: 'api/FinancialGoals'
  },

  // Notification endpoints
  notifications: {
    list: 'api/Notifications',
    mark_read: 'api/Notifications',
    mark_all_read: 'api/Notifications/read-all',
    delete: 'api/Notifications'
  },

  // User Preferences endpoints
  user_preferences: {
    get: 'api/users/preferences',
    update: 'api/users/preferences'
  }
};
