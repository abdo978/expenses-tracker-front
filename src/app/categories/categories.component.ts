import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { CategoryService, CreateCategoryCommand, UpdateCategoryCommand, CategoryDto } from '../service/category.service';
import { AuthService } from '../service/auth/auth.service';
import { AlertService } from '../service/alerts.service';
import { toggleAnimation } from 'src/app/shared/animations';

@Component({
  templateUrl: './categories.component.html',
  animations: [toggleAnimation],
})
export class CategoriesComponent implements OnInit {
  @ViewChild('categoryModal') categoryModal!: NgxCustomModalComponent;

  loading = false;
  currentPage = 1;
  recordsPerPage = 10;
  
  // Data
  categories: CategoryDto[] = [];
  filteredCategories: CategoryDto[] = [];
  
  // Form and Modal
  categoryForm!: FormGroup;
  isEditing = false;
  editingId: string | null = null;

  // Filters
  searchTerm = '';
  selectedDefault: boolean | null = null;

  // Options
  defaultOptions = [
    { label: 'All Categories', value: null },
    { label: 'Default Categories', value: true },
    { label: 'Custom Categories', value: false }
  ];

  // Table columns
  cols = [
    { field: 'name', title: 'Name', sort: true },
    { field: 'description', title: 'Description', sort: false },
    { field: 'icon', title: 'Icon', sort: false },
    { field: 'isDefault', title: 'Type', sort: true },
    { field: 'actions', title: 'Actions', sort: false },
  ];

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadCategories();
  }

  initForm() {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      icon: [''],
      color: ['#6c757d', Validators.required]
    });
  }

  loadCategories() {
    this.loading = true;
    
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.categories = response.data.$values || [];
          this.applyFilters();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.alertService.sweetAlertIt('Failed to load categories', 'Error!', 'error');
        this.loading = false;
        this.categories = [];
        this.filteredCategories = [];
      }
    });
  }

  applyFilters() {
    let filtered = [...this.categories];

    // Search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(category => 
        (category.name?.toLowerCase().includes(searchLower)) ||
        (category.description?.toLowerCase().includes(searchLower))
      );
    }

    // Default/Custom filter
    if (this.selectedDefault !== null) {
      filtered = filtered.filter(category => category.isDefault === this.selectedDefault);
    }

    this.filteredCategories = filtered;
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedDefault = null;
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(event: any) {
    this.currentPage = event.current_page;
    this.recordsPerPage = event.pagesize;
  }

  openAddModal() {
    this.isEditing = false;
    this.editingId = null;
    this.categoryForm.reset();
    this.categoryForm.patchValue({
      color: '#6c757d'
    });
    
    if (this.categoryModal) {
      this.categoryModal.open();
    }
  }

  editCategory(category: CategoryDto) {
    this.isEditing = true;
    this.editingId = category.id;
    
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color || '#6c757d'
    });
    
    if (this.categoryModal) {
      this.categoryModal.open();
    }
  }

  saveCategory() {
    if (this.categoryForm.invalid) {
      this.alertService.sweetAlertIt('Please fill in all required fields!', 'Attention!', 'warning');
      return;
    }

    const user = this.authService.getUserData();
    if (!user?.id) {
      this.alertService.sweetAlertIt('User not found. Please login again.', 'Error!', 'error');
      return;
    }

    const formValue = this.categoryForm.value;
    
    if (this.isEditing && this.editingId) {
      const updateCommand: UpdateCategoryCommand = {
        id: this.editingId,
        userId: user.id,
        name: formValue.name,
        description: formValue.description,
        icon: formValue.icon,
        color: formValue.color
      };

      this.categoryService.updateCategory(this.editingId, updateCommand).subscribe({
        next: (response) => {
          if (response.status === 200) {
            this.alertService.sweetAlertIt('Category updated successfully!', 'Success!');
            if (this.categoryModal) {
              this.categoryModal.close();
            }
            this.loadCategories();
          } else {
            this.alertService.sweetAlertIt('An error occurred. Please try again.', 'Error!', 'error');
          }
        },
        error: (error) => {
          console.error('API Error:', error);
          this.alertService.sweetAlertIt('Unable to process your request. Please check your connection or try again later.', 'Error!', 'error');
        }
      });
    } else {
      const createCommand: CreateCategoryCommand = {
        userId: user.id,
        name: formValue.name,
        description: formValue.description,
        icon: formValue.icon,
        color: formValue.color
      };

      this.categoryService.createCategory(createCommand).subscribe({
        next: (response) => {
          if (response.status === 200 || response.status === 201) {
            this.alertService.sweetAlertIt('Category added successfully!', 'Success!');
            if (this.categoryModal) {
              this.categoryModal.close();
            }
            this.loadCategories();
          } else {
            this.alertService.sweetAlertIt('An error occurred. Please try again.', 'Error!', 'error');
          }
        },
        error: (error) => {
          console.error('API Error:', error);
          this.alertService.sweetAlertIt('Unable to process your request. Please check your connection or try again later.', 'Error!', 'error');
        }
      });
    }
  }

  async deleteCategory(id: string) {
    // Find the category to check if it's default
    const category = this.categories.find(cat => cat.id === id);
    
    if (category?.isDefault) {
      this.alertService.sweetAlertIt('Cannot delete default categories!', 'Warning!', 'warning');
      return;
    }

    const alertOptions = {
      title: 'Delete Category',
      text: 'Are you sure you want to delete this category? This action cannot be undone.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const isConfirmed = await this.alertService.confirmDialog(alertOptions);

    if (isConfirmed) {
      this.categoryService.deleteCategory(id).subscribe({
        next: (response) => {
          if (response.status === 200) {
            this.alertService.sweetAlertIt('Category deleted successfully!', 'Success!');
            this.loadCategories();
          } else {
            this.alertService.sweetAlertIt('An error occurred. Please try again.', 'Error!', 'error');
          }
        },
        error: (error) => {
          console.error('API Error:', error);
          this.alertService.sweetAlertIt('Unable to process your request. Please check your connection or try again later.', 'Error!', 'error');
        }
      });
    }
  }
}