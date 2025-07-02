import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { AuthService } from '../service/auth/auth.service';
import { AlertService } from '../service/alerts.service';
import { toggleAnimation } from 'src/app/shared/animations';
import { FinancialGoalService, CreateFinancialGoalCommand, UpdateFinancialGoalCommand, AddGoalContributionCommand } from '../service/financialGoal.service';

interface FinancialGoalWithStats {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  percentage: number;
  startDate: string;
  targetDate: string;
  daysLeft: number;
  status: 'on-track' | 'at-risk' | 'achieved' | 'overdue';
  contributions?: any[];
}

interface GoalHighlight {
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  daysLeft: number;
  targetDate: string;
}

@Component({
  templateUrl: './financial-goals.component.html',
  animations: [toggleAnimation],
})
export class FinancialGoalsComponent implements OnInit {
  @ViewChild('goalModal') goalModal!: NgxCustomModalComponent;
  @ViewChild('contributionModal') contributionModal!: NgxCustomModalComponent;

  loading = false;
  currentPage = 1;
  recordsPerPage = 10;
  totalRows = 0;
  
  // Data
  financialGoals: FinancialGoalWithStats[] = [];
  goalHighlights: GoalHighlight[] = [];
  selectedGoal: FinancialGoalWithStats | null = null;
  
  // Stats
  activeGoals = 0;
  completedGoals = 0;
  totalTargetAmount = 0;
  totalSaved = 0;

  // Charts
  goalProgressChart: any;
  goalStatusChart: any;
  store: any;
  Math = Math;

  // Forms and Modals
  goalForm!: FormGroup;
  contributionForm!: FormGroup;
  isEditing = false;
  editingId: string | null = null;

  // Filters
  searchTerm = '';
  selectedStatus: string | null = null;
  dateRange: string = '';
  minAmount: number | null = null;
  maxAmount: number | null = null;
  startDate: string = '';
  endDate: string = '';

  // Options
  statusOptions = [
    { label: 'All Status', value: null },
    { label: 'On Track', value: 'on-track' },
    { label: 'At Risk', value: 'at-risk' },
    { label: 'Achieved', value: 'achieved' },
    { label: 'Overdue', value: 'overdue' }
  ];

  // Goal icons mapping
  goalIcons: { [key: string]: string } = {
    'emergency': '🛡️',
    'vacation': '✈️',
    'car': '🚗',
    'house': '🏠',
    'education': '🎓',
    'retirement': '👴',
    'wedding': '💒',
    'business': '💼',
    'investment': '📈',
    'default': '🎯'
  };

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
    { field: 'name', title: 'Goal', sort: true },
    { field: 'target', title: 'Target', sort: true },
    { field: 'current', title: 'Current', sort: true },
    { field: 'progress', title: 'Progress', sort: false },
    { field: 'timeline', title: 'Timeline', sort: false },
    { field: 'status', title: 'Status', sort: false },
    { field: 'actions', title: 'Actions', sort: false },
  ];

  constructor(
    private fb: FormBuilder,
    private financialGoalService: FinancialGoalService,
    private authService: AuthService,
    private alertService: AlertService,
    public storeData: Store<any>
  ) {
    this.initStore();
    this.initForms();
  }

  ngOnInit() {
    this.loadFinancialGoals();
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

  initForms() {
    this.goalForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      targetAmount: ['', [Validators.required, Validators.min(1)]],
      startDate: ['', Validators.required],
      targetDate: ['', Validators.required]
    });

    this.contributionForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: ['', Validators.required],
      notes: ['']
    });

    // Set default date for contribution form
    this.contributionForm.patchValue({
      date: new Date().toISOString().split('T')[0]
    });
  }

  getGoalIcon(goalName: string): string {
    const name = goalName.toLowerCase();
    for (const [key, icon] of Object.entries(this.goalIcons)) {
      if (name.includes(key) && key !== 'default') {
        return icon;
      }
    }
    return this.goalIcons['default'];
  }

  loadFinancialGoals() {
    this.loading = true;
    
    this.financialGoalService.getFinancialGoals().subscribe({
      next: (response) => {
        if (response.status === 200) {
          const rawGoals = response.data.$values || [];
          this.processGoals(rawGoals);
          this.totalRows = this.financialGoals.length;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading financial goals:', error);
        this.alertService.sweetAlertIt('Failed to load financial goals', 'Error!', 'error');
        this.loading = false;
        this.financialGoals = [];
      }
    });
  }

  processGoals(rawGoals: any[]) {
    this.financialGoals = rawGoals.map(goal => {
      // Calculate current amount from contributions
      const currentAmount = goal.contributions?.$values?.reduce((sum: number, contrib: any) => sum + contrib.amount, 0) || 0;
      const remaining = goal.targetAmount - currentAmount;
      const percentage = goal.targetAmount > 0 ? Math.round((currentAmount / goal.targetAmount) * 100) : 0;
      
      const today = new Date();
      const targetDate = new Date(goal.targetDate);
      const daysLeft = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'on-track' | 'at-risk' | 'achieved' | 'overdue' = 'on-track';
      if (percentage >= 100) {
        status = 'achieved';
      } else if (daysLeft < 0) {
        status = 'overdue';
      } else if (daysLeft < 30 && percentage < 80) {
        status = 'at-risk';
      }

      return {
        ...goal,
        currentAmount,
        remaining,
        percentage,
        daysLeft,
        status
      };
    });

    setTimeout(() => {
      console.log('goals : ');
    }, 2000);
    

    this.calculateStats();
    this.prepareGoalHighlights();
    this.initCharts();
  }

  calculateStats() {
    this.activeGoals = this.financialGoals.filter(g => g.status === 'on-track' || g.status === 'at-risk').length;
    this.completedGoals = this.financialGoals.filter(g => g.status === 'achieved').length;
    this.totalTargetAmount = this.financialGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    this.totalSaved = this.financialGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  }

  prepareGoalHighlights() {
    this.goalHighlights = this.financialGoals
      .filter(goal => goal.status !== 'achieved')
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6)
      .map(goal => ({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        percentage: goal.percentage,
        daysLeft: goal.daysLeft,
        targetDate: goal.targetDate
      }));
  }

  initCharts() {
    const isDark = this.store?.theme === 'dark' || this.store?.isDarkMode;
    const isRtl = this.store?.rtlClass === 'rtl';

    // Goal Progress Timeline Chart
    const progressData = this.getGoalProgressData();
    this.goalProgressChart = {
      chart: {
        height: 300,
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
      colors: ['#00ab55', '#e2a03f'],
      xaxis: {
        categories: progressData.categories,
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
      legend: {
        position: 'top',
        horizontalAlign: 'center',
        fontSize: '14px',
        itemMargin: { horizontal: 8, vertical: 8 },
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
      series: [
        {
          name: 'Target Amount',
          data: progressData.targetData
        },
        {
          name: 'Current Amount',
          data: progressData.currentData
        }
      ],
    };

    // Goal Status Pie Chart
    const statusData = this.getGoalStatusData();
    this.goalStatusChart = {
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
                formatter: () => this.financialGoals.length.toString(),
              },
            },
          },
        },
      },
      colors: ['#00ab55', '#e2a03f', '#e7515a', '#6c757d'],
      labels: statusData.labels,
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '14px',
        markers: { width: 10, height: 10, offsetX: -2 },
        height: 50,
        offsetY: 20,
      },
      series: statusData.data,
    };
  }

  getGoalProgressData() {
    const goalNames = this.financialGoals.map(g => g.name.substring(0, 8) + (g.name.length > 8 ? '..' : ''));
    const targetData = this.financialGoals.map(g => g.targetAmount);
    const currentData = this.financialGoals.map(g => g.currentAmount);

    return { categories: goalNames, targetData, currentData };
  }

  getGoalStatusData() {
    const onTrack = this.financialGoals.filter(g => g.status === 'on-track').length;
    const atRisk = this.financialGoals.filter(g => g.status === 'at-risk').length;
    const achieved = this.financialGoals.filter(g => g.status === 'achieved').length;
    const overdue = this.financialGoals.filter(g => g.status === 'overdue').length;

    return {
      labels: ['On Track', 'At Risk', 'Achieved', 'Overdue'],
      data: [onTrack, atRisk, achieved, overdue]
    };
  }

  getGoalStatusClass(goal: FinancialGoalWithStats): string {
    switch (goal.status) {
      case 'on-track':
        return 'badge-outline-success';
      case 'at-risk':
        return 'badge-outline-warning';
      case 'achieved':
        return 'badge-outline-info';
      case 'overdue':
        return 'badge-outline-danger';
      default:
        return 'badge-outline-secondary';
    }
  }

  getGoalStatusText(goal: FinancialGoalWithStats): string {
    switch (goal.status) {
      case 'on-track':
        return 'On Track';
      case 'at-risk':
        return 'At Risk';
      case 'achieved':
        return 'Achieved';
      case 'overdue':
        return 'Overdue';
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
    this.loadFinancialGoals();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedStatus = null;
    this.dateRange = '';
    this.minAmount = null;
    this.maxAmount = null;
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.loadFinancialGoals();
  }

  onPageChange(event: any) {
    this.currentPage = event.current_page;
    this.recordsPerPage = event.pagesize;
    this.loadFinancialGoals();
  }

  openAddModal() {
    this.isEditing = false;
    this.editingId = null;
    this.goalForm.reset();
    this.goalForm.patchValue({
      startDate: new Date().toISOString().split('T')[0],
    });
    
    if (this.goalModal) {
      this.goalModal.open();
    }
  }

  editGoal(goal: FinancialGoalWithStats) {
    this.isEditing = true;
    this.editingId = goal.id;
    
    this.goalForm.patchValue({
      name: goal.name,
      description: goal.description,
      targetAmount: goal.targetAmount,
      startDate: goal.startDate.split('T')[0],
      targetDate: goal.targetDate.split('T')[0]
    });
    
    if (this.goalModal) {
      this.goalModal.open();
    }
  }

  addContribution(goal: FinancialGoalWithStats) {
    this.selectedGoal = goal;
    this.contributionForm.reset();
    this.contributionForm.patchValue({
      date: new Date().toISOString().split('T')[0]
    });
    
    if (this.contributionModal) {
      this.contributionModal.open();
    }
  }

  saveGoal() {
    if (this.goalForm.invalid) {
      this.alertService.sweetAlertIt('Please fill in all required fields!', 'Attention!', 'warning');
      return;
    }

    const user = this.authService.getUserData();
    if (!user?.id) {
      this.alertService.sweetAlertIt('User not found. Please login again.', 'Error!', 'error');
      return;
    }

    const formValue = this.goalForm.value;
    
    if (this.isEditing && this.editingId) {
      const updateCommand: UpdateFinancialGoalCommand = {
        id: this.editingId,
        userId: user.id,
        name: formValue.name,
        description: formValue.description,
        targetAmount: formValue.targetAmount,
        startDate: formValue.startDate,
        targetDate: formValue.targetDate
      };

      this.financialGoalService.updateFinancialGoal(this.editingId, updateCommand).subscribe({
        next: (response) => {
          if (response.status === 200) {
            this.alertService.sweetAlertIt('Goal updated successfully!', 'Success!');
            if (this.goalModal) {
              this.goalModal.close();
            }
            this.loadFinancialGoals();
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
      const createCommand: CreateFinancialGoalCommand = {
        userId: user.id,
        name: formValue.name,
        description: formValue.description,
        targetAmount: formValue.targetAmount,
        startDate: formValue.startDate,
        targetDate: formValue.targetDate
      };

      this.financialGoalService.createFinancialGoal(createCommand).subscribe({
        next: (response) => {
          if (response.status === 200 || response.status === 201) {
            this.alertService.sweetAlertIt('Goal created successfully!', 'Success!');
            if (this.goalModal) {
              this.goalModal.close();
            }
            this.loadFinancialGoals();
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

  saveContribution() {
    if (this.contributionForm.invalid || !this.selectedGoal) {
      this.alertService.sweetAlertIt('Please fill in all required fields!', 'Attention!', 'warning');
      return;
    }

    const user = this.authService.getUserData();
    if (!user?.id) {
      this.alertService.sweetAlertIt('User not found. Please login again.', 'Error!', 'error');
      return;
    }

    const formValue = this.contributionForm.value;
    const contributionCommand: AddGoalContributionCommand = {
      financialGoalId: this.selectedGoal.id,
      userId: user.id,
      amount: formValue.amount,
      date: formValue.date,
      notes: formValue.notes
    };

    this.financialGoalService.addGoalContribution(this.selectedGoal.id, contributionCommand).subscribe({
      next: (response) => {
        if (response.status === 200 || response.status === 201) {
          this.alertService.sweetAlertIt('Contribution added successfully!', 'Success!');
          if (this.contributionModal) {
            this.contributionModal.close();
          }
          this.loadFinancialGoals();
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

  async deleteGoal(id: string) {
    const alertOptions = {
      title: 'Delete Financial Goal',
      text: 'Are you sure you want to delete this financial goal? This action cannot be undone and will remove all contributions.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const isConfirmed = await this.alertService.confirmDialog(alertOptions);

    if (isConfirmed) {
      this.financialGoalService.deleteFinancialGoal(id).subscribe({
        next: (response) => {
          if (response.status === 200) {
            this.alertService.sweetAlertIt('Financial goal deleted successfully!', 'Success!');
            this.loadFinancialGoals();
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