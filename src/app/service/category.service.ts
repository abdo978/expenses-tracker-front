import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { Apis } from './API';

export interface CreateCategoryCommand {
  userId: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryCommand {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface CategoryDto {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all categories
   * GET /api/Categories
   */
  getCategories() {
    return this.apiService.get(`${Apis.categories.list}`);
  }

  /**
   * Create a new category
   * POST /api/Categories
   */
  createCategory(category: CreateCategoryCommand) {
    return this.apiService.post(`${Apis.categories.create}`, category);
  }

  /**
   * Get category by ID
   * GET /api/Categories/{id}
   */
  getCategoryById(id: string) {
    return this.apiService.get(`${Apis.categories.get_by_id}/${id}`);
  }

  /**
   * Update category
   * PUT /api/Categories/{id}
   */
  updateCategory(id: string, category: UpdateCategoryCommand) {
    return this.apiService.put(`${Apis.categories.update}/${id}`, category);
  }

  /**
   * Delete category
   * DELETE /api/Categories/{id}
   */
  deleteCategory(id: string) {
    return this.apiService.delete(`${Apis.categories.delete}/${id}`);
  }
}