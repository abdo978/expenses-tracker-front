import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { BudgetService, CreateBudgetCommand, UpdateBudgetCommand } from '../service/budget.service';
import { CategoryService, CategoryDto } from '../service/category.service';
import { ExpenseService } from '../service/expense.service';
import { AuthService } from '../service/auth/auth.service';
import { AlertService } from '../service/alerts.service';
import { toggleAnimation } from 'src/app/shared/animations';

interface BudgetWithStats {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  startDate: string;
  endDate: string;
  period: string;
  daysLeft: number;
  status: 'active' | 'overbudget' | 'expired';
}

interface BudgetProgress {
  categoryName: string;
  categoryColor: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  daysLeft: number;
}

@Component({
  templateUrl: './budget.component.html',
  animations: [toggleAnimation],
})
export class BudgetsComponent implements OnInit {
  @ViewChild('budgetModal') budgetModal!: NgxCustomModalComponent;

  loading = false;
  currentPage = 1;
  recordsPerPage = 10;
  totalRows = 0;
  
  // Data
  budgets: BudgetWithStats[] = [];
  categories: CategoryDto[] = [];
  expenses: any[] = [];
  budgetProgress: BudgetProgress[] = [];
  
  // Stats
  activeBudgets = 0;
  totalBudgetAmount = 0;
  totalSpent = 0;
  totalRemaining = 0;

  // Charts
  budgetComparisonChart: any;
  budgetHealthChart: any;
  store: any;
  Math = Math;

  // Form and Modal
  budgetForm!: FormGroup;
  isEditing = false;
  editingId: string | null = null;

  // Filters
  selectedCategory: string | null = null;
  selectedPeriod: string | null = null;
  selectedStatus: string | null = null;
  dateRange: string = '';
  startDate: string = '';
  endDate: string = '';

  // Options
  periodOptions = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'Custom', value: 'custom' }
  ];

  statusOptions = [
    { label: 'All Status', value: null },
    { label: 'Active', value: 'active' },
    { label: 'Over Budget', value: 'overbudget' },
    { label: 'Expired', value: 'expired' }
  ];

  // Calendar options
  dateRangeCalendar: FlatpickrDefaultsInterface = {
    dateFormat: 'Y-m-d',
    mode: 'range',
    monthSelectorType: 'dropdown',
  };

  singleDateCalendar: FlatpickrDefaultsInterface = {
    dateFormat: 'Y-m-d',
    monthSelectorType: 'dropdown',
  };

  // Table columns
  cols = [
    { field: 'category', title: 'Category', sort: false },
    { field: 'amount', title: 'Budget', sort: true },
    { field: 'spent', title: 'Spent', sort: true },
    { field: 'progress', title: 'Progress', sort: false },
    { field: 'period', title: 'Period', sort: false },
    { field: 'status', title: 'Status', sort: false },
    { field: 'actions', title: 'Actions', sort: false },
  ];

  constructor(
    private fb: FormBuilder,
    private budgetService: BudgetService,
    private categoryService: CategoryService,
    private expenseService: ExpenseService,
    private authService: AuthService,
    private alertService: AlertService,
    public storeData: Store<any>
  ) {
    this.initStore();
    this.initForm();
  }

  ngOnInit() {
    this.loadCategories();
    this.loadBudgets();
    this.loadExpenses();
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        const hasChangeTheme = this.store?.theme !== d?.theme;
        this.store = d;
        
        if (hasChangeTheme) {
          setTimeout(() => {
            this.initCharts();
          }, 300);
        }
      });
  }

  initForm() {
    this.budgetForm = this.fb.group({
      categoryId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      period: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });

    // Auto-calculate end date based on period
    this.budgetForm.get('period')?.valueChanges.subscribe(period => {
      const startDate = this.budgetForm.get('startDate')?.value;
      if (startDate && period && period !== 'custom') {
        const start = new Date(startDate);
        let endDate = new Date(start);
        
        switch (period) {
          case 'weekly':
            endDate.setDate(start.getDate() + 7);
            break;
          case 'monthly':
            endDate.setMonth(start.getMonth() + 1);
            break;
          case 'quarterly':
            endDate.setMonth(start.getMonth() + 3);
            break;
          case 'yearly':
            endDate.setFullYear(start.getFullYear() + 1);
            break;
        }
        
        this.budgetForm.get('endDate')?.setValue(endDate.toISOString().split('T')[0]);
      }
    });
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.categories = response.data.$values || [];
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadExpenses() {
    this.expenseService.getExpenses().subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.expenses = response.data.$values || [];
          this.calculateBudgetStats();
        }
      },
      error: (error) => {
        console.error('Error loading expenses:', error);
      }
    });
  }

  loadBudgets() {
    this.loading = true;
    
    this.budgetService.getBudgets().subscribe({
      next: (response) => {
        if (response.status === 200) {
          const rawBudgets = response.data.$values || [];
          this.processBudgets(rawBudgets);
          this.totalRows = this.budgets.length;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading budgets:', error);
        this.alertService.sweetAlertIt('Failed to load budgets', 'Error!', 'error');
        this.loading = false;
        this.budgets = [];
      }
    });
  }

  processBudgets(rawBudgets: any[]) {
    this.budgets = rawBudgets.map(budget => {
      const category = this.categories.find(cat => cat.id === budget.categoryId);
      const categoryExpenses = this.expenses.filter(exp => 
        exp.category?.id === budget.categoryId &&
        new Date(exp.date) >= new Date(budget.startDate) &&
        new Date(exp.date) <= new Date(budget.endDate)
      );
      
      const spent = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
      
      const today = new Date();
      const endDate = new Date(budget.endDate);
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'active' | 'overbudget' | 'expired' = 'active';
      if (daysLeft < 0) status = 'expired';
      else if (percentage > 100) status = 'overbudget';

      return {
        ...budget,
        categoryName: category?.name || 'Unknown',
        categoryColor: category?.color || '#6c757d',
        spent,
        remaining,
        percentage,
        daysLeft,
        status
      };
    });

    this.calculateStats();
    this.prepareBudgetProgress();
    this.initCharts();
  }

  calculateStats() {
    this.activeBudgets = this.budgets.filter(b => b.status === 'active').length;
    this.totalBudgetAmount = this.budgets.reduce((sum, b) => sum + b.amount, 0);
    this.totalSpent = this.budgets.reduce((sum, b) => sum + b.spent, 0);
    this.totalRemaining = this.totalBudgetAmount - this.totalSpent;
  }

  calculateBudgetStats() {
    if (this.budgets.length > 0) {
      this.processBudgets(this.budgets);
    }
  }

  prepareBudgetProgress() {
    this.budgetProgress = this.budgets
      .filter(budget => budget.status !== 'expired')
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6)
      .map(budget => ({
        categoryName: budget.categoryName,
        categoryColor: budget.categoryColor,
        amount: budget.amount,
        spent: budget.spent,
        remaining: budget.remaining,
        percentage: budget.percentage,
        daysLeft: budget.daysLeft
      }));
  }

  initCharts() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode;
    const isRtl = this.store?.rtlClass === 'rtl';

    // Budget vs Actual Comparison Chart
    const comparisonData = this.getBudgetComparisonData();
    this.budgetComparisonChart = {
      chart: {
        height: 300,
        type: 'bar',
        fontFamily: 'Nunito, sans-serif',
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      stroke: {
        width: 2,
        colors: ['transparent'],
      },
      colors: ['#00ab55', '#e7515a'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 8,
          borderRadiusApplication: 'end',
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'center',
        fontSize: '14px',
        itemMargin: { horizontal: 8, vertical: 8 },
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        padding: { left: 20, right: 20 },
      },
      xaxis: {
        categories: comparisonData.categories,
        axisBorder: {
          show: true,
          color: isDark ? '#3b3f5c' : '#e0e6ed',
        },
        labels: {
          style: { fontSize: '12px' },
        },
      },
      yaxis: {
        tickAmount: 6,
        opposite: isRtl,
        labels: {
          offsetX: isRtl ? -10 : 0,
          formatter: (value: number) => '$' + value.toFixed(0),
        },
      },
      tooltip: {
        y: {
          formatter: (val: any) => '$' + val.toFixed(2),
        },
      },
      series: [
        {
          name: 'Budget',
          data: comparisonData.budgetData
        },
        {
          name: 'Spent',
          data: comparisonData.spentData
        }
      ],
    };

    // Budget Health Pie Chart
    const healthData = this.getBudgetHealthData();
    this.budgetHealthChart = {
      chart: {
        type: 'donut',
        height: 300,
        fontFamily: 'Nunito, sans-serif',
      },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            background: 'transparent',
            labels: {
              show: true,
              name: { show: true, fontSize: '16px', offsetY: -10 },
              value: {
                show: true,
                fontSize: '14px',
                color: isDark ? '#bfc9d4' : undefined,
                offsetY: 16,
                formatter: (val: any) => val,
              },
              total: {
                show: true,
                label: 'Total',
                color: '#888ea8',
                fontSize: '16px',
                formatter: () => this.budgets.length.toString(),
              },
            },
          },
        },
      },
      colors: ['#00ab55', '#e2a03f', '#e7515a'],
      labels: healthData.labels,
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '14px',
        markers: { width: 10, height: 10, offsetX: -2 },
        height: 50,
        offsetY: 20,
      },
      series: healthData.data,
    };
  }

  getBudgetComparisonData() {
    const categories = this.budgets.map(b => b.categoryName.substring(0, 10) + (b.categoryName.length > 10 ? '...' : ''));
    const budgetData = this.budgets.map(b => b.amount);
    const spentData = this.budgets.map(b => b.spent);

    return { categories, budgetData, spentData };
  }

  getBudgetHealthData() {
    const onTrack = this.budgets.filter(b => b.percentage <= 80 && b.status === 'active').length;
    const warning = this.budgets.filter(b => b.percentage > 80 && b.percentage <= 100 && b.status === 'active').length;
    const overBudget = this.budgets.filter(b => b.status === 'overbudget').length;

    return {
      labels: ['On Track', 'Warning', 'Over Budget'],
      data: [onTrack, warning, overBudget]
    };
  }

  getBudgetStatusClass(budget: BudgetWithStats): string {
    switch (budget.status) {
      case 'active':
        return budget.percentage > 80 ? 'badge-outline-warning' : 'badge-outline-success';
      case 'overbudget':
        return 'badge-outline-danger';
      case 'expired':
        return 'badge-outline-secondary';
      default:
        return 'badge-outline-secondary';
    }
  }

  getBudgetStatusText(budget: BudgetWithStats): string {
    switch (budget.status) {
      case 'active':
        return budget.percentage > 80 ? 'Warning' : 'On Track';
      case 'overbudget':
        return 'Over Budget';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  }

  applyFilters() {
    if (this.dateRange) {
      const dates = this.dateRange.split(' to ');
      this.startDate = dates[0];
      this.endDate = dates[1] || dates[0];
    }
    this.loadBudgets();
  }

  resetFilters() {
    this.selectedCategory = null;
    this.selectedPeriod = null;
    this.selectedStatus = null;
    this.dateRange = '';
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.loadBudgets();
  }

  onPageChange(event: any) {
    this.currentPage = event.current_page;
    this.recordsPerPage = event.pagesize;
    this.loadBudgets();
  }

  openAddModal() {
    this.isEditing = false;
    this.editingId = null;
    this.budgetForm.reset();
    this.budgetForm.patchValue({
      startDate: new Date().toISOString().split('T')[0],
    });
    
    if (this.budgetModal) {
      this.budgetModal.open();
    }
  }

  editBudget(budget: BudgetWithStats) {
    this.isEditing = true;
    this.editingId = budget.id;
    
    this.budgetForm.patchValue({
      categoryId: budget.categoryId,
      amount: budget.amount,
      period: budget.period,
      startDate: budget.startDate.split('T')[0],
      endDate: budget.endDate.split('T')[0]
    });
    
    if (this.budgetModal) {
      this.budgetModal.open();
    }
  }

  saveBudget() {
    if (this.budgetForm.invalid) {
      this.alertService.sweetAlertIt('Please fill in all required fields!', 'Attention!', 'warning');
      return;
    }

    const user = this.authService.getUserData();
    if (!user?.id) {
      this.alertService.sweetAlertIt('User not found. Please login again.', 'Error!', 'error');
      return;
    }

    const formValue = this.budgetForm.value;
    
    if (this.isEditing && this.editingId) {
      const updateCommand: UpdateBudgetCommand = {
        id: this.editingId,
        userId: user.id,
        categoryId: formValue.categoryId,
        amount: formValue.amount,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        period: formValue.period
      };

      this.budgetService.updateBudget(this.editingId, updateCommand).subscribe({
        next: (response) => {
          if (response.status === 200) {
            this.alertService.sweetAlertIt('Budget updated successfully!', 'Success!');
            if (this.budgetModal) {
              this.budgetModal.close();
            }
            this.loadBudgets();
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
      const createCommand: CreateBudgetCommand = {
        userId: user.id,
        categoryId: formValue.categoryId,
        amount: formValue.amount,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        period: formValue.period
      };

      this.budgetService.createBudget(createCommand).subscribe({
        next: (response) => {
          if (response.status === 200 || response.status === 201) {
            this.alertService.sweetAlertIt('Budget created successfully!', 'Success!');
            if (this.budgetModal) {
              this.budgetModal.close();
            }
            this.loadBudgets();
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

  async deleteBudget(id: string) {
    const alertOptions = {
      title: 'Delete Budget',
      text: 'Are you sure you want to delete this budget? This action cannot be undone.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const isConfirmed = await this.alertService.confirmDialog(alertOptions);

    if (isConfirmed) {
      this.budgetService.deleteBudget(id).subscribe({
        next: (response) => {
          if (response.status === 200) {
            this.alertService.sweetAlertIt('Budget deleted successfully!', 'Success!');
            this.loadBudgets();
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