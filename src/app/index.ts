import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, forkJoin, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { toggleAnimation } from 'src/app/shared/animations';
import { ExpenseDto, ExpenseQueryParams, ExpenseService } from './service/expense.service';
import { CategoryDto, CategoryService } from './service/category.service';
import { BudgetService } from './service/budget.service';
import { FinancialGoalService } from './service/financialGoal.service';
import { AuthService } from './service/auth/auth.service';

interface DashboardStats {
  totalExpenses: number;
  monthlyExpenses: number;
  budgetRemaining: number;
  savingsRate: number;
  avgDailySpending: number;
  topCategory: string;
}

interface CategoryExpense {
  categoryName: string;
  amount: number;
  color: string;
  percentage: number;
}

// API Response interfaces to match actual structure
interface ApiResponse<T> {
  status: number;
  data: {
    $id: string;
    $values: T[];
  };
}

@Component({
  templateUrl: './index.html',
  animations: [toggleAnimation],
})
export class IndexComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  store: any;
  isLoading = true;

  // Dashboard Data
  stats: DashboardStats = {
    totalExpenses: 0,
    monthlyExpenses: 0,
    budgetRemaining: 0,
    savingsRate: 0,
    avgDailySpending: 0,
    topCategory: ''
  };

  recentExpenses: ExpenseDto[] = [];
  categoryExpenses: CategoryExpense[] = [];
  monthlyTrend: any[] = [];
  budgetProgress: any[] = [];
  upcomingRecurring: ExpenseDto[] = [];

  // Chart Configurations
  expensesTrendChart: any;
  categoryBreakdownChart: any;
  budgetVsActualChart: any;
  dailySpendingChart: any;
  goalProgressChart: any;

  // Quick Stats Charts
  totalExpensesChart: any;
  monthlyGrowthChart: any;
  savingsChart: any;
  budgetChart: any;

  constructor(
    public storeData: Store<any>,
    private expenseService: ExpenseService,
    private categoryService: CategoryService,
    private budgetService: BudgetService,
    private financialGoalService: FinancialGoalService,
    private authService: AuthService
  ) {
    this.initStore();
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initStore() {
    this.storeData
      .select((d) => d.index)
      .pipe(takeUntil(this.destroy$))
      .subscribe((d) => {
        const hasChangeTheme = this.store?.theme !== d?.theme;
        const hasChangeLayout = this.store?.layout !== d?.layout;
        const hasChangeMenu = this.store?.menu !== d?.menu;
        const hasChangeSidebar = this.store?.sidebar !== d?.sidebar;

        this.store = d;

        if (hasChangeTheme || hasChangeLayout || hasChangeMenu || hasChangeSidebar) {
          if (this.isLoading || hasChangeTheme) {
            this.initCharts();
          } else {
            setTimeout(() => {
              this.initCharts();
            }, 300);
          }
        }
      });
  }

  loadDashboardData() {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const last6Months = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);

    const currentUser = this.authService.getUserData();
    if (!currentUser?.id) {
      this.isLoading = false;
      return;
    }

    // Build query parameters
    const currentMonthParams: ExpenseQueryParams = {
      userId: currentUser.id,
      startDate: startOfMonth.toISOString(),
      endDate: endOfMonth.toISOString()
    };

    const last6MonthsParams: ExpenseQueryParams = {
      userId: currentUser.id,
      startDate: last6Months.toISOString(),
      endDate: currentDate.toISOString()
    };

    const recentParams: ExpenseQueryParams = {
      userId: currentUser.id,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: currentDate.toISOString()
    };

    // Load all data in parallel
    forkJoin({
      monthlyExpenses: this.expenseService.getExpenses(currentMonthParams),
      last6MonthsExpenses: this.expenseService.getExpenses(last6MonthsParams),
      recentExpenses: this.expenseService.getExpenses(recentParams),
      categories: this.categoryService.getCategories(),
      budgets: this.budgetService.getBudgets(),
      recurringExpenses: this.expenseService.getRecurringExpenses(),
      financialGoals: this.financialGoalService.getFinancialGoals()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        console.log('Raw API data:', data);
        
        this.processExpenseData(data);
        this.initCharts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  // Helper method to extract data from API response
  private extractApiData<T>(response: ApiResponse<T> | any): T[] {
    // Handle both old format (direct array) and new format (wrapped in status/data)
    if (response && typeof response === 'object') {
      if (response.status && response.data && response.data.$values) {
        return response.data.$values as T[];
      }
      if (Array.isArray(response)) {
        return response as T[];
      }
      if (response.data && Array.isArray(response.data)) {
        return response.data as T[];
      }
    }
    return [] as T[];
  }

  processExpenseData(data: any) {
    // Extract actual data arrays from API response structure with proper typing
    const monthlyExpenses = this.extractApiData<ExpenseDto>(data.monthlyExpenses);
    const last6MonthsExpenses = this.extractApiData<ExpenseDto>(data.last6MonthsExpenses);
    const recentExpenses = this.extractApiData<ExpenseDto>(data.recentExpenses);
    const categories = this.extractApiData<CategoryDto>(data.categories);
    const budgets = this.extractApiData<any>(data.budgets);
    const recurringExpenses = this.extractApiData<ExpenseDto>(data.recurringExpenses);
    const financialGoals = this.extractApiData<any>(data.financialGoals);

    console.log('Processed data:', {
      monthlyExpenses: monthlyExpenses.length,
      categories: categories.length,
      budgets: budgets.length
    });
    
    // Calculate basic stats
    this.stats.monthlyExpenses = monthlyExpenses.reduce((sum: number, exp: ExpenseDto) => sum + exp.amount, 0);
    this.stats.totalExpenses = last6MonthsExpenses.reduce((sum: number, exp: ExpenseDto) => sum + exp.amount, 0);
    
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    this.stats.avgDailySpending = currentDay > 0 ? this.stats.monthlyExpenses / currentDay : 0;

    // Calculate budget remaining
    const totalBudget = budgets.reduce((sum: number, budget: any) => sum + budget.amount, 0);
    this.stats.budgetRemaining = totalBudget - this.stats.monthlyExpenses;
    this.stats.savingsRate = totalBudget > 0 ? ((totalBudget - this.stats.monthlyExpenses) / totalBudget) * 100 : 0;

    // Process category expenses
    this.categoryExpenses = this.processCategoryExpenses(monthlyExpenses, categories);
    this.stats.topCategory = this.categoryExpenses.length > 0 ? this.categoryExpenses[0].categoryName : 'No data';

    // Get recent expenses (last 10)
    this.recentExpenses = recentExpenses
      .sort((a: ExpenseDto, b: ExpenseDto) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Process monthly trend
    this.monthlyTrend = this.processMonthlyTrend(last6MonthsExpenses);

    // Process budget progress - Updated to handle actual budget structure
    this.budgetProgress = this.processBudgetProgress(budgets, monthlyExpenses);

    // Upcoming recurring expenses
    this.upcomingRecurring = recurringExpenses
      .filter((expense: ExpenseDto) => expense.isRecurring)
      .slice(0, 5);
  }

  processCategoryExpenses(expenses: ExpenseDto[], categories: CategoryDto[]): CategoryExpense[] {
    const categoryMap = new Map<string, { amount: number; color: string; name: string }>();
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    expenses.forEach(expense => {
      const category = categories.find(cat => cat.id === expense.category?.id);
      const categoryName = category?.name || 'Other';
      const categoryColor = category?.color || '#6b7280';

      if (categoryMap.has(categoryName)) {
        categoryMap.get(categoryName)!.amount += expense.amount;
      } else {
        categoryMap.set(categoryName, {
          amount: expense.amount,
          color: categoryColor,
          name: categoryName
        });
      }
    });

    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        categoryName: name,
        amount: data.amount,
        color: data.color,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  processMonthlyTrend(expenses: ExpenseDto[]): any[] {
    const monthMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + expense.amount);
    });

    // Generate last 6 months including current month
    const months = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        month: date.toLocaleDateString('en', { month: 'short' }),
        amount: Math.round(monthMap.get(monthKey) || 0)
      });
    }

    return months;
  }

  processBudgetProgress(budgets: any[], expenses: ExpenseDto[]): any[] {
    return budgets.map(budget => {
      // Use spentAmount from budget if available, otherwise calculate from expenses
      const calculatedSpent = expenses
        .filter(exp => exp.category?.id === budget.categoryId)
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      const spent = budget.spentAmount !== undefined ? budget.spentAmount : calculatedSpent;
      
      return {
        categoryName: budget.category?.name || 'Unknown',
        budgeted: budget.amount,
        spent: spent,
        remaining: budget.amount - spent,
        percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      };
    });
  }

  initCharts() {
    const isDark = this.store.theme === 'dark' || this.store.isDarkMode;
    const isRtl = this.store.rtlClass === 'rtl';

    // Only initialize charts if we have data
    if (this.monthlyTrend.length === 0) {
      // Create default trend with zeros for current month
      this.monthlyTrend = [{
        month: new Date().toLocaleDateString('en', { month: 'short' }),
        amount: this.stats.monthlyExpenses
      }];
    }

    // Expenses Trend Chart (Line Chart)
    this.expensesTrendChart = {
      chart: {
        height: 325,
        type: 'area',
        fontFamily: 'Nunito, sans-serif',
        zoom: { enabled: false },
        toolbar: { show: false }
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        curve: 'smooth',
        width: 2,
        lineCap: 'square'
      },
      colors: isDark ? ['#e74c3c', '#3498db'] : ['#e74c3c', '#2980b9'],
      labels: this.monthlyTrend.map(item => item.month),
      series: [{
        name: 'Monthly Expenses',
        data: this.monthlyTrend.map(item => item.amount)
      }],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          inverseColors: false,
          opacityFrom: isDark ? 0.19 : 0.28,
          opacityTo: 0.05,
          stops: isDark ? [100, 100] : [45, 100]
        }
      },
      grid: {
        borderColor: isDark ? '#191e3a' : '#e0e6ed',
        strokeDashArray: 5
      },
      yaxis: {
        tickAmount: 7,
        labels: {
          formatter: (value: number) => '$' + (value / 1000).toFixed(1) + 'K',
          offsetX: isRtl ? -30 : -10
        },
        opposite: isRtl
      }
    };

    // Category Breakdown (Donut Chart)
    this.categoryBreakdownChart = {
      chart: {
        type: 'donut',
        height: 400,
        fontFamily: 'Nunito, sans-serif'
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 25,
        colors: isDark ? '#0e1726' : '#fff'
      },
      colors: this.categoryExpenses.length > 0 ? this.categoryExpenses.map(cat => cat.color) : ['#6b7280'],
      labels: this.categoryExpenses.length > 0 ? this.categoryExpenses.map(cat => cat.categoryName) : ['No Data'],
      series: this.categoryExpenses.length > 0 ? this.categoryExpenses.map(cat => Math.round(cat.amount)) : [1],
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '14px'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: { show: true, fontSize: '20px' },
              value: {
                show: true,
                fontSize: '16px',
                formatter: (val: any) => '$' + parseFloat(val).toLocaleString()
              },
              total: {
                show: true,
                label: 'Total Spent',
                fontSize: '18px',
                formatter: () => '$' + this.stats.monthlyExpenses.toLocaleString()
              }
            }
          }
        }
      }
    };

    // Budget vs Actual (Bar Chart)
    this.budgetVsActualChart = {
      chart: {
        height: 350,
        type: 'bar',
        fontFamily: 'Nunito, sans-serif',
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 8
        }
      },
      dataLabels: { enabled: false },
      colors: ['#3b82f6', '#ef4444'],
      series: [
        {
          name: 'Budgeted',
          data: this.budgetProgress.length > 0 ? this.budgetProgress.map(item => Math.round(item.budgeted)) : [0]
        },
        {
          name: 'Spent',
          data: this.budgetProgress.length > 0 ? this.budgetProgress.map(item => Math.round(item.spent)) : [0]
        }
      ],
      xaxis: {
        categories: this.budgetProgress.length > 0 ? this.budgetProgress.map(item => item.categoryName) : ['No Data']
      },
      yaxis: {
        labels: {
          formatter: (value: number) => '$' + value.toLocaleString()
        }
      }
    };

    // Quick Stats Charts
    this.totalExpensesChart = {
      chart: {
        height: 58,
        type: 'line',
        fontFamily: 'Nunito, sans-serif',
        sparkline: { enabled: true }
      },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#e74c3c'],
      series: [{
        data: this.monthlyTrend.length >= 7 ? 
          this.monthlyTrend.slice(-7).map(item => item.amount) : 
          [...Array(7).fill(0)].map((_, i) => i === 6 ? this.stats.monthlyExpenses : 0)
      }]
    };

    this.monthlyGrowthChart = {
      chart: {
        height: 58,
        type: 'line',
        fontFamily: 'Nunito, sans-serif',
        sparkline: { enabled: true }
      },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#3498db'],
      series: [{
        data: this.monthlyTrend.length >= 7 ? 
          this.monthlyTrend.slice(-7).map((item, index, array) => 
            index > 0 && array[index - 1].amount > 0 ? 
              ((item.amount - array[index - 1].amount) / array[index - 1].amount) * 100 : 0
          ) : 
          Array(7).fill(0)
      }]
    };

    this.savingsChart = {
      chart: {
        height: 58,
        type: 'line',
        fontFamily: 'Nunito, sans-serif',
        sparkline: { enabled: true }
      },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#27ae60'],
      series: [{
        data: [65, 70, 68, 75, 72, 78, this.stats.savingsRate]
      }]
    };
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getExpenseIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      'Food': 'restaurant',
      'Transportation': 'car',
      'Shopping': 'shopping-bag',
      'Entertainment': 'gamepad',
      'Health': 'heart',
      'Bills': 'receipt',
      'Education': 'book',
      'Travel': 'airplane'
    };
    return iconMap[categoryName] || 'dollar-sign';
  }

  // Event handlers
  onPeriodChange(period: string) {
    // Implement period filtering
    console.log('Period changed:', period);
    this.loadDashboardData();
  }

  onCategoryFilter(categoryId: string) {
    // Implement category filtering
    console.log('Category filter:', categoryId);
  }

  addQuickExpense() {
    // Navigate to add expense
    console.log('Add quick expense');
  }

  viewAllExpenses() {
    // Navigate to expenses list
    console.log('View all expenses');
  }

  viewBudgets() {
    // Navigate to budgets
    console.log('View budgets');
  }

  viewGoals() {
    // Navigate to financial goals
    console.log('View goals');
  }
}