import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { Apis } from './API';

export interface CreateExpenseCommand {
  userId: string;
  description?: string;
  amount: number;
  date: string;
  categoryId: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  isShared: boolean;
  notes?: string;
}

export interface UpdateExpenseCommand {
  id: string;
  userId: string;
  description?: string;
  amount: number;
  date: string;
  categoryId: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  isShared: boolean;
  notes?: string;
}

export interface ExpenseDto {
  id: string;
  description?: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  nextRecurringDate?: string;
  isShared: boolean;
  notes?: string;
  category: any;
  attachments?: any[];
}

export interface ExpenseQueryParams {
  userId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  isRecurring?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all expenses with optional filters
   * GET /api/Expenses
   */
  getExpenses(params?: ExpenseQueryParams) {
    let queryString = '';
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
      queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    }
    return this.apiService.get(`${Apis.expenses.list}${queryString}`);
  }

  /**
   * Create a new expense
   * POST /api/Expenses
   */
  createExpense(expense: CreateExpenseCommand) {
    return this.apiService.post(`${Apis.expenses.create}`, expense);
  }

  /**
   * Get expense by ID
   * GET /api/Expenses/{id}
   */
  getExpenseById(id: string) {
    return this.apiService.get(`${Apis.expenses.get_by_id}/${id}`);
  }

  /**
   * Update expense
   * PUT /api/Expenses/{id}
   */
  updateExpense(id: string, expense: UpdateExpenseCommand) {
    return this.apiService.put(`${Apis.expenses.update}/${id}`, expense);
  }

  /**
   * Delete expense
   * DELETE /api/Expenses/{id}
   */
  deleteExpense(id: string) {
    return this.apiService.delete(`${Apis.expenses.delete}/${id}`);
  }

  /**
   * Get expenses by user ID
   */
  getExpensesByUser(userId: string) {
    return this.getExpenses({ userId });
  }

  /**
   * Get expenses by category
   */
  getExpensesByCategory(categoryId: string) {
    return this.getExpenses({ categoryId });
  }

  /**
   * Get expenses by date range
   */
  getExpensesByDateRange(startDate: string, endDate: string) {
    return this.getExpenses({ startDate, endDate });
  }

  /**
   * Get recurring expenses
   */
  getRecurringExpenses() {
    return this.getExpenses({ isRecurring: true });
  }
}