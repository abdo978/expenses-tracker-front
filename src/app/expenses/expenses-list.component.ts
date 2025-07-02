import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { ExpenseService, CreateExpenseCommand, UpdateExpenseCommand, ExpenseDto, ExpenseQueryParams } from '../service/expense.service';
import { CategoryService, CategoryDto } from '../service/category.service';
import { BudgetService } from '../service/budget.service';
import { AuthService } from '../service/auth/auth.service';
import { AlertService } from '../service/alerts.service';
import { toggleAnimation } from 'src/app/shared/animations';

@Component({
  templateUrl: './expenses-list.component.html',
  animations: [toggleAnimation],
})
export class ExpensesComponent implements OnInit {
  @ViewChild('expenseModal') expenseModal!: NgxCustomModalComponent;

  loading = false;
  currentPage = 1;
  recordsPerPage = 10;
  totalRows = 0;
  
  // Data
  expenses: ExpenseDto[] = [];
  categories: CategoryDto[] = [];
  budgets: any[] = [];
  
  // Stats
  totalExpenses = 0;
  monthlyExpenses = 0;
  recurringExpenses: ExpenseDto[] = [];
  averageExpense = 0;

  // Charts
  monthlyTrendChart: any;
  categoryChart: any;
  store: any;

  // Form and Modal
  expenseForm!: FormGroup;
  isEditing = false;
  editingId: string | null = null;

  // Filters
  selectedCategory: string | null = null;
  selectedRecurring: boolean | null = null;
  dateRange: string = '';
  minAmount: number | null = null;
  maxAmount: number | null = null;
  startDate: string = '';
  endDate: string = '';

  // Options
  recurringOptions = [
    { label: 'All', value: null },
    { label: 'Recurring Only', value: true },
    { label: 'One-time Only', value: false }
  ];

  frequencyOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' }
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
    { field: 'description', title: 'Description', sort: false },
    { field: 'amount', title: 'Amount', sort: true },
    { field: 'category', title: 'Category', sort: false },
    { field: 'date', title: 'Date', sort: true },
    { field: 'isRecurring', title: 'Type', sort: false },
    { field: 'isShared', title: 'Sharing', sort: false },
    { field: 'actions', title: 'Actions', sort: false },
  ];

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private categoryService: CategoryService,
    private budgetService: BudgetService,
    private authService: AuthService,
    private alertService: AlertService,
    public storeData: Store<any>
  ) {

    this.monthlyTrendChart = { series: [] };
    this.categoryChart = { series: [] };
    
    this.initStore();
    this.initForm();
  }

  ngOnInit() {
    this.loadCategories();
    this.loadExpenses();
    this.loadBudgets();
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
    this.expenseForm = this.fb.group({
      description: [''],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      categoryId: ['', Validators.required],
      date: ['', Validators.required],
      isRecurring: [false],
      recurringFrequency: [''],
      isShared: [false],
      notes: ['']
    });

    // Watch for recurring changes
    this.expenseForm.get('isRecurring')?.valueChanges.subscribe(isRecurring => {
      const frequencyControl = this.expenseForm.get('recurringFrequency');
      if (isRecurring) {
        frequencyControl?.setValidators(Validators.required);
        frequencyControl?.setValue('monthly');
      } else {
        frequencyControl?.clearValidators();
        frequencyControl?.setValue('');
      }
      frequencyControl?.updateValueAndValidity();
    });
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.categories = response.data.$values;
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.alertService.sweetAlertIt('Failed to load categories', 'Error!', 'error');
      }
    });
  }

  loadBudgets() {
    this.budgetService.getBudgets().subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.budgets = response.data.$values;
          console.log(this.budgets);
          
        }
      },
      error: (error) => {
        console.error('Error loading budgets:', error);
      }
    });
  }

  loadExpenses() {
    this.loading = true;
    
    const params: ExpenseQueryParams = {};
    
    if (this.selectedCategory) params.categoryId = this.selectedCategory;
    if (this.selectedRecurring !== null) params.isRecurring = this.selectedRecurring;
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;

    this.expenseService.getExpenses(params).subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.expenses = response.data?.$values || response.data || [];
          this.totalRows = this.expenses.length;
          this.calculateStats();
          this.initCharts();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading expenses:', error);
        this.alertService.sweetAlertIt('Failed to load expenses', 'Error!', 'error');
        this.loading = false;
      }
    });
  }

  calculateStats() {
    // Filter expenses if amount filters are applied
    let filteredExpenses = this.expenses;
    
    if (this.minAmount !== null) {
      filteredExpenses = filteredExpenses.filter(exp => exp.amount >= this.minAmount!);
    }
    if (this.maxAmount !== null) {
      filteredExpenses = filteredExpenses.filter(exp => exp.amount <= this.maxAmount!);
    }

    this.totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    this.monthlyExpenses = filteredExpenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    this.recurringExpenses = filteredExpenses.filter(exp => exp.isRecurring);
    this.averageExpense = filteredExpenses.length > 0 ? this.totalExpenses / filteredExpenses.length : 0;
  }

  initCharts() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode;
    const isRtl = this.store?.rtlClass === 'rtl';

    // Monthly trend chart
    const monthlyData = this.getMonthlyTrendData();
    this.monthlyTrendChart = {
      chart: {
        height: 250,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        zoom: { enabled: false },
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        curve: 'smooth',
        width: 2,
        lineCap: 'square',
      },
      colors: isDark ? ['#2196f3'] : ['#1b55e2'],
      xaxis: {
        categories: monthlyData.categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          offsetX: isRtl ? 2 : 0,
          offsetY: 5,
          style: { fontSize: '12px' },
        },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          formatter: (value: number) => '$' + value.toFixed(0),
          offsetX: isRtl ? -30 : -10,
          offsetY: 0,
          style: { fontSize: '12px' },
        },
        opposite: isRtl,
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        strokeDashArray: 5,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
      },
      tooltip: {
        marker: { show: true },
        x: { show: false },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          inverseColors: false,
          opacityFrom: isDark ? 0.19 : 0.28,
          opacityTo: 0.05,
          stops: isDark ? [100, 100] : [45, 100],
        },
      },
      series: [{
        name: 'Expenses',
        data: monthlyData.data
      }],
    };

    // Category pie chart
    const categoryData = this.getCategoryChartData();
    this.categoryChart = {
      chart: {
        type: 'donut',
        height: 250,
        fontFamily: 'Nunito, sans-serif',
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 25,
        colors: isDark ? '#0e1726' : '#fff',
      },
      colors: ['#e2a03f', '#5c1ac3', '#e7515a', '#00ab55', '#2196f3', '#ff9800'],
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '14px',
        markers: { width: 10, height: 10, offsetX: -2 },
        height: 50,
        offsetY: 20,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            background: 'transparent',
            labels: {
              show: true,
              name: { show: true, fontSize: '20px', offsetY: -10 },
              value: {
                show: true,
                fontSize: '16px',
                color: isDark ? '#bfc9d4' : undefined,
                offsetY: 16,
                formatter: (val: any) => '$' + val,
              },
              total: {
                show: true,
                label: 'Total',
                color: '#888ea8',
                fontSize: '20px',
                formatter: (w: any) => {
                  return 'test' + w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0).toFixed(0);
                },
              },
            },
          },
        },
      },
      labels: categoryData.labels,
      series: categoryData.data,
    };
  }

  getMonthlyTrendData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyTotals = new Array(12).fill(0);

    this.expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      if (expenseDate.getFullYear() === currentYear) {
        monthlyTotals[expenseDate.getMonth()] += expense.amount;
      }
    });

    return {
      categories: months,
      data: monthlyTotals
    };
  }

  getCategoryChartData() {
    const categoryTotals: { [key: string]: number } = {};
    const categoryNames: { [key: string]: string } = {};

    this.expenses.forEach(expense => {
      const categoryId = expense.category?.id || 'uncategorized';
      const categoryName = expense.category?.name || 'Uncategorized';
      
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = 0;
        categoryNames[categoryId] = categoryName;
      }
      categoryTotals[categoryId] += expense.amount;
    });

    const labels = Object.values(categoryNames);
    const data = Object.values(categoryTotals);

    return { labels, data };
  }

  applyFilters() {
    if (this.dateRange) {
      const dates = this.dateRange.split(' to ');
      this.startDate = dates[0];
      this.endDate = dates[1] || dates[0];
    }
    this.loadExpenses();
  }

  resetFilters() {
    this.selectedCategory = null;
    this.selectedRecurring = null;
    this.dateRange = '';
    this.minAmount = null;
    this.maxAmount = null;
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.loadExpenses();
  }

  onPageChange(event: any) {
    this.currentPage = event.current_page;
    this.recordsPerPage = event.pagesize;
    this.loadExpenses();
  }

  openAddModal() {
    this.isEditing = false;
    this.editingId = null;
    this.expenseForm.reset();
    this.expenseForm.patchValue({
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      isShared: false
    });

    if (this.expenseModal) {
        this.expenseModal.open();
    }
  }

  editExpense(expense: ExpenseDto) {
    this.isEditing = true;
    this.editingId = expense.id;
    
    this.expenseForm.patchValue({
      description: expense.description,
      amount: expense.amount,
      categoryId: expense.category?.id,
      date: expense.date.split('T')[0], // Convert to YYYY-MM-DD format
      isRecurring: expense.isRecurring,
      recurringFrequency: expense.recurringFrequency,
      isShared: expense.isShared,
      notes: expense.notes
    });
    
    this.expenseModal.open();
  }

  saveExpense() {
    if (this.expenseForm.invalid) {
      this.alertService.sweetAlertIt('Please fill in all required fields!', 'Attention!', 'warning');
      return;
    }

    const user = this.authService.getUserData();
    if (!user?.id) {
      this.alertService.sweetAlertIt('User not found. Please login again.', 'Error!', 'error');
      return;
    }

    const formValue = this.expenseForm.value;
    
    if (this.isEditing && this.editingId) {
      const updateCommand: UpdateExpenseCommand = {
        id: this.editingId,
        userId: user.id,
        description: formValue.description,
        amount: formValue.amount,
        date: formValue.date,
        categoryId: formValue.categoryId,
        isRecurring: formValue.isRecurring,
        recurringFrequency: formValue.isRecurring ? formValue.recurringFrequency : '',
        isShared: formValue.isShared,
        notes: formValue.notes
      };

      this.expenseService.updateExpense(this.editingId, updateCommand).subscribe({
        next: (response) => {
          if (response.status === 200) {
            this.alertService.sweetAlertIt('Expense updated successfully!', 'Success!');
            this.expenseModal.close();
            this.loadExpenses();
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
      const createCommand: CreateExpenseCommand = {
        userId: user.id,
        description: formValue.description,
        amount: formValue.amount,
        date: formValue.date,
        categoryId: formValue.categoryId,
        isRecurring: formValue.isRecurring,
        recurringFrequency: formValue.isRecurring ? formValue.recurringFrequency : '',
        isShared: formValue.isShared,
        notes: formValue.notes
      };

      this.expenseService.createExpense(createCommand).subscribe({
        next: (response) => {
          if (response.status === 200 || response.status === 201) {
            this.alertService.sweetAlertIt('Expense added successfully!', 'Success!');
            this.expenseModal.close();
            this.loadExpenses();
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

  async deleteExpense(id: string) {
    const alertOptions = {
      title: 'Delete Expense',
      text: 'Are you sure you want to delete this expense?',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const isConfirmed = await this.alertService.confirmDialog(alertOptions);

    if (isConfirmed) {
      this.expenseService.deleteExpense(id).subscribe({
        next: (response) => {
          if (response.status === 200) {
            this.alertService.sweetAlertIt('Expense deleted successfully!', 'Success!');
            this.loadExpenses();
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