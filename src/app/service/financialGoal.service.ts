import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { Apis } from './API';

export interface CreateFinancialGoalCommand {
  userId: string;
  name?: string;
  description?: string;
  targetAmount: number;
  startDate: string;
  targetDate: string;
}

export interface UpdateFinancialGoalCommand {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  targetAmount: number;
  startDate: string;
  targetDate: string;
}

export interface AddGoalContributionCommand {
  financialGoalId: string;
  userId: string;
  amount: number;
  date: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FinancialGoalService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all financial goals
   * GET /api/FinancialGoals
   */
  getFinancialGoals() {
    return this.apiService.get(`${Apis.financial_goals.list}`);
  }

  /**
   * Create a new financial goal
   * POST /api/FinancialGoals
   */
  createFinancialGoal(goal: CreateFinancialGoalCommand) {
    return this.apiService.post(`${Apis.financial_goals.create}`, goal);
  }

  /**
   * Get financial goal by ID
   * GET /api/FinancialGoals/{id}
   */
  getFinancialGoalById(id: string) {
    return this.apiService.get(`${Apis.financial_goals.get_by_id}/${id}`);
  }

  /**
   * Update financial goal
   * PUT /api/FinancialGoals/{id}
   */
  updateFinancialGoal(id: string, goal: UpdateFinancialGoalCommand) {
    return this.apiService.put(`${Apis.financial_goals.update}/${id}`, goal);
  }

  /**
   * Delete financial goal
   * DELETE /api/FinancialGoals/{id}
   */
  deleteFinancialGoal(id: string) {
    return this.apiService.delete(`${Apis.financial_goals.delete}/${id}`);
  }

  /**
   * Add contribution to financial goal
   * POST /api/FinancialGoals/{id}/contributions
   */
  addGoalContribution(id: string, contribution: AddGoalContributionCommand) {
    return this.apiService.post(`${Apis.financial_goals.add_contribution}/${id}/contributions`, contribution);
  }
}