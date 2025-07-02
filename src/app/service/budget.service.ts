import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { Apis } from './API';

export interface CreateBudgetCommand {
  userId: string;
  categoryId: string;
  amount: number;
  startDate: string;
  endDate: string;
  period?: string;
}

export interface UpdateBudgetCommand {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  startDate: string;
  endDate: string;
  period?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all budgets
   * GET /api/Budgets
   */
  getBudgets() {
    return this.apiService.get(`${Apis.budgets.list}`);
  }

  /**
   * Create a new budget
   * POST /api/Budgets
   */
  createBudget(budget: CreateBudgetCommand) {
    return this.apiService.post(`${Apis.budgets.create}`, budget);
  }

  /**
   * Get budget by ID
   * GET /api/Budgets/{id}
   */
  getBudgetById(id: string) {
    return this.apiService.get(`${Apis.budgets.get_by_id}/${id}`);
  }

  /**
   * Update budget
   * PUT /api/Budgets/{id}
   */
  updateBudget(id: string, budget: UpdateBudgetCommand) {
    return this.apiService.put(`${Apis.budgets.update}/${id}`, budget);
  }

  /**
   * Delete budget
   * DELETE /api/Budgets/{id}
   */
  deleteBudget(id: string) {
    return this.apiService.delete(`${Apis.budgets.delete}/${id}`);
  }

  /**
   * Get budgets by category
   * GET /api/Budgets/category/{categoryId}
   */
  getBudgetsByCategory(categoryId: string) {
    return this.apiService.get(`${Apis.budgets.by_category}/${categoryId}`);
  }
}