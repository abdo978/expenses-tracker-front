import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { toggleAnimation } from 'src/app/shared/animations';
import Swal from 'sweetalert2';

// Plugins
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Services
import { ExpenseService, CreateExpenseCommand, UpdateExpenseCommand } from '../service/expense.service';
import { CategoryService, CategoryDto } from '../service/category.service';
import { BudgetService } from '../service/budget.service';
import { FinancialGoalService } from '../service/financialGoal.service';
import { AuthService } from '../service/auth/auth.service';
import { AlertService } from '../service/alerts.service';

@Component({
    templateUrl: './calendar.html',
    animations: [toggleAnimation],
})
export class CalendarComponent implements OnInit {
    store: any;
    isLoading = true;

    @ViewChild('quickExpenseModal') quickExpenseModal!: NgxCustomModalComponent;
    @ViewChild('eventDetailsModal') eventDetailsModal!: NgxCustomModalComponent;
    @ViewChild('calendar') calendar!: FullCalendarComponent;

    // Forms
    expenseForm!: FormGroup;

    // Data
    events: any[] = [];
    categories: CategoryDto[] = [];
    expenses: any[] = [];
    budgets: any[] = [];
    financialGoals: any[] = [];
    selectedEvent: any = null;

    // Calendar options
    calendarOptions: any;
    minDate: string = '';

    // Options
    frequencyOptions = [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' }
    ];

    constructor(
        public fb: FormBuilder,
        public storeData: Store<any>,
        private expenseService: ExpenseService,
        private categoryService: CategoryService,
        private budgetService: BudgetService,
        private financialGoalService: FinancialGoalService,
        private authService: AuthService,
        private alertService: AlertService
    ) {
        this.initStore();
        this.initForm();
        this.isLoading = false;
    }

    ngOnInit() {
        this.loadData();
        this.setMinDate();
    }

    async initStore() {
        this.storeData
            .select((d: any) => d.index)
            .subscribe((d: any) => {
                const hasChangeLayout = this.store?.layout !== d?.layout;
                const hasChangeMenu = this.store?.menu !== d?.menu;
                const hasChangeSidebar = this.store?.sidebar !== d?.sidebar;

                this.store = d;

                if (hasChangeLayout || hasChangeMenu || hasChangeSidebar) {
                    if (this.isLoading) {
                        this.initCalendar();
                    } else {
                        setTimeout(() => {
                            this.initCalendar();
                        }, 300);
                    }
                }
            });
    }

    initCalendar() {
        this.calendarOptions = {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
            },
            editable: false,
            dayMaxEvents: 3,
            selectable: true,
            droppable: false,
            eventClick: (event: any) => {
                this.showEventDetails(event);
            },
            select: (event: any) => {
                this.addExpenseForDate(event);
            },
            events: this.events,
            height: 'auto',
            eventDisplay: 'block',
            displayEventTime: true,
        };
    }

    initForm() {
        this.expenseForm = this.fb.group({
            description: ['', Validators.required],
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

    setMinDate() {
        const now = new Date();
        this.minDate = now.toISOString().slice(0, 16);
    }

    loadData() {
        this.loadCategories();
        this.loadExpenses();
        this.loadBudgets();
        this.loadFinancialGoals();
    }

    loadCategories() {
        this.categoryService.getCategories().subscribe({
            next: (response) => {
                if (response.status === 200) {
                    // Handle .NET response structure
                    this.categories = response.data?.$values || response.data || [];
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
                    // Handle .NET response structure
                    this.expenses = response.data?.$values || response.data || [];
                    this.processExpensesForCalendar();
                }
            },
            error: (error) => {
                console.error('Error loading expenses:', error);
            }
        });
    }

    loadBudgets() {
        this.budgetService.getBudgets().subscribe({
            next: (response) => {
                if (response.status === 200) {
                    // Handle .NET response structure
                    this.budgets = response.data?.$values || response.data || [];
                    this.processBudgetsForCalendar();
                }
            },
            error: (error) => {
                console.error('Error loading budgets:', error);
            }
        });
    }

    loadFinancialGoals() {
        this.financialGoalService.getFinancialGoals().subscribe({
            next: (response) => {
                if (response.status === 200) {
                    // Handle .NET response structure
                    this.financialGoals = response.data?.$values || response.data || [];
                    this.processGoalsForCalendar();
                }
            },
            error: (error) => {
                console.error('Error loading financial goals:', error);
            }
        });
    }

    processExpensesForCalendar() {
        const expenseEvents = this.expenses.map(expense => ({
            id: `expense-${expense.id}`,
            title: expense.description || 'Expense',
            start: expense.date,
            backgroundColor: expense.isRecurring ? '#e74c3c' : '#3498db',
            borderColor: expense.isRecurring ? '#c0392b' : '#2980b9',
            extendedProps: {
                type: 'expense',
                originalId: expense.id,
                amount: expense.amount,
                category: expense.category,
                isRecurring: expense.isRecurring,
                recurringFrequency: expense.recurringFrequency,
                isShared: expense.isShared,
                notes: expense.notes
            }
        }));

        this.updateEvents(expenseEvents, 'expense');
    }

    processBudgetsForCalendar() {
        const budgetEvents: any[] = [];
        
        this.budgets.forEach(budget => {
            // Add budget start event
            budgetEvents.push({
                id: `budget-start-${budget.id}`,
                title: `Budget: ${budget.categoryName || 'Unknown'} (Start)`,
                start: budget.startDate,
                backgroundColor: '#27ae60',
                borderColor: '#229954',
                extendedProps: {
                    type: 'budget',
                    subType: 'start',
                    originalId: budget.id,
                    amount: budget.amount,
                    category: budget.categoryName
                }
            });

            // Add budget end event
            budgetEvents.push({
                id: `budget-end-${budget.id}`,
                title: `Budget: ${budget.categoryName || 'Unknown'} (End)`,
                start: budget.endDate,
                backgroundColor: '#f39c12',
                borderColor: '#e67e22',
                extendedProps: {
                    type: 'budget',
                    subType: 'end',
                    originalId: budget.id,
                    amount: budget.amount,
                    category: budget.categoryName
                }
            });
        });

        this.updateEvents(budgetEvents, 'budget');
    }

    processGoalsForCalendar() {
        const goalEvents = this.financialGoals.map(goal => ({
            id: `goal-${goal.id}`,
            title: `Goal: ${goal.name} (Deadline)`,
            start: goal.targetDate,
            backgroundColor: '#f1c40f',
            borderColor: '#f39c12',
            extendedProps: {
                type: 'goal',
                originalId: goal.id,
                amount: goal.targetAmount,
                name: goal.name,
                description: goal.description
            }
        }));

        this.updateEvents(goalEvents, 'goal');
    }

    updateEvents(newEvents: any[], type: string) {
        // Remove existing events of this type
        this.events = this.events.filter(event => 
            !event.extendedProps?.type || event.extendedProps.type !== type
        );
        
        // Add new events
        this.events.push(...newEvents);
        
        // Update calendar
        if (this.calendarOptions) {
            this.calendarOptions.events = [...this.events];
        }
    }

    addQuickExpense() {
        this.selectedEvent = null;
        this.expenseForm.reset();
        this.expenseForm.patchValue({
            date: new Date().toISOString().slice(0, 16),
            isRecurring: false,
            isShared: false
        });
        
        if (this.quickExpenseModal) {
            this.quickExpenseModal.open();
        }
    }

    addExpenseForDate(dateInfo: any) {
        this.selectedEvent = null;
        this.expenseForm.reset();
        
        const selectedDate = new Date(dateInfo.start);
        const formattedDate = selectedDate.toISOString().slice(0, 16);
        
        this.expenseForm.patchValue({
            date: formattedDate,
            isRecurring: false,
            isShared: false
        });
        
        if (this.quickExpenseModal) {
            this.quickExpenseModal.open();
        }
    }

    showEventDetails(eventInfo: any) {
        this.selectedEvent = eventInfo.event;
        
        if (this.eventDetailsModal) {
            this.eventDetailsModal.open();
        }
    }

    editExpenseFromCalendar() {
        if (!this.selectedEvent || this.selectedEvent.extendedProps?.type !== 'expense') {
            return;
        }

        const expense = this.expenses.find(e => e.id === this.selectedEvent.extendedProps.originalId);
        if (!expense) return;

        this.expenseForm.patchValue({
            description: expense.description,
            amount: expense.amount,
            categoryId: expense.category?.id,
            date: new Date(expense.date).toISOString().slice(0, 16),
            isRecurring: expense.isRecurring,
            recurringFrequency: expense.recurringFrequency,
            isShared: expense.isShared,
            notes: expense.notes
        });

        if (this.eventDetailsModal) {
            this.eventDetailsModal.close();
        }
        
        if (this.quickExpenseModal) {
            this.quickExpenseModal.open();
        }
    }

    async deleteExpenseFromCalendar() {
        if (!this.selectedEvent || this.selectedEvent.extendedProps?.type !== 'expense') {
            return;
        }

        const alertOptions = {
            title: 'Delete Expense',
            text: 'Are you sure you want to delete this expense?',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
        };

        const isConfirmed = await this.alertService.confirmDialog(alertOptions);

        if (isConfirmed) {
            this.expenseService.deleteExpense(this.selectedEvent.extendedProps.originalId).subscribe({
                next: (response) => {
                    if (response.status === 200) {
                        this.alertService.sweetAlertIt('Expense deleted successfully!', 'Success!');
                        this.loadExpenses(); // Refresh calendar
                        if (this.eventDetailsModal) {
                            this.eventDetailsModal.close();
                        }
                    }
                },
                error: (error) => {
                    console.error('Error deleting expense:', error);
                    this.alertService.sweetAlertIt('Error deleting expense', 'Error!', 'error');
                }
            });
        }
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
        
        if (this.selectedEvent && this.selectedEvent.extendedProps?.type === 'expense') {
            // Update existing expense
            const updateCommand: UpdateExpenseCommand = {
                id: this.selectedEvent.extendedProps.originalId,
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

            this.expenseService.updateExpense(this.selectedEvent.extendedProps.originalId, updateCommand).subscribe({
                next: (response) => {
                    if (response.status === 200) {
                        this.showMessage('Expense updated successfully!');
                        this.loadExpenses();
                        if (this.quickExpenseModal) {
                            this.quickExpenseModal.close();
                        }
                    }
                },
                error: (error) => {
                    console.error('Error updating expense:', error);
                    this.alertService.sweetAlertIt('Error updating expense', 'Error!', 'error');
                }
            });
        } else {
            // Create new expense
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
                        this.showMessage('Expense added successfully!');
                        this.loadExpenses();
                        if (this.quickExpenseModal) {
                            this.quickExpenseModal.close();
                        }
                    }
                },
                error: (error) => {
                    console.error('Error creating expense:', error);
                    this.alertService.sweetAlertIt('Error creating expense', 'Error!', 'error');
                }
            });
        }
    }

    getEventTypeClass(type: string): string {
        switch (type) {
            case 'expense':
                return 'badge-outline-primary';
            case 'budget':
                return 'badge-outline-success';
            case 'goal':
                return 'badge-outline-warning';
            default:
                return 'badge-outline-secondary';
        }
    }

    getEventTypeLabel(type: string): string {
        switch (type) {
            case 'expense':
                return 'Expense';
            case 'budget':
                return 'Budget';
            case 'goal':
                return 'Goal';
            default:
                return 'Event';
        }
    }

    showMessage(msg = '', type = 'success') {
        const toast: any = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 3000,
            customClass: { container: 'toast' },
        });
        toast.fire({
            icon: type,
            title: msg,
            padding: '10px 20px',
        });
    }
}