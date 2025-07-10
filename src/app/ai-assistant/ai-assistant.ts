import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AIAssistantService, McpProcessRequest } from '../service/ai-assistant.service';
import { ExpenseService } from '../service/expense.service';
import { BudgetService } from '../service/budget.service';
import { CategoryService } from '../service/category.service';
import { AuthService } from '../service/auth/auth.service';
import { AlertService } from '../service/alerts.service';
import { toggleAnimation } from 'src/app/shared/animations';
import { FinancialGoalService } from '../service/financialGoal.service';

interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface QuickQuestion {
  title: string;
  description: string;
  prompt: string;
}

interface FinancialContext {
  recentExpenses?: any[];
  activeBudgets?: any[];
  financialGoals?: any[];
  categories?: any[];
  totalMonthlyExpenses?: number;
  totalBudgetAmount?: number;
  completedGoals?: number;
}

@Component({
  templateUrl: './ai-assistant.html',
  animations: [toggleAnimation],
})
export class AIAssistantComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  chatForm!: FormGroup;
  messages: ChatMessage[] = [];
  isProcessing = false;
  includeContext = true;
  ignoreHistory = false;

  // Financial data for context
  financialContext: FinancialContext = {};

  quickQuestions: QuickQuestion[] = [
    {
      title: "Monthly Spending",
      description: "How much did I spend this month?",
      prompt: "How much have I spent this month and what are my top expense categories?"
    },
    {
      title: "Budget Status",
      description: "Check my budget progress",
      prompt: "How am I doing with my budgets? Am I staying within my limits?"
    },
    {
      title: "Savings Goals",
      description: "Check goal progress",
      prompt: "What's the status of my financial goals and savings progress?"
    },
    {
      title: "Expense Analysis",
      description: "Analyze spending patterns",
      prompt: "Analyze my recent spending patterns and suggest areas where I can save money."
    },
    {
      title: "Budget Recommendations",
      description: "Get budget advice",
      prompt: "Based on my spending habits, what budget adjustments would you recommend?"
    },
    {
      title: "Financial Health",
      description: "Overall financial overview",
      prompt: "Give me an overall assessment of my financial health and key recommendations."
    }
  ];

  constructor(
    private fb: FormBuilder,
    private aiAssistantService: AIAssistantService,
    private expenseService: ExpenseService,
    private budgetService: BudgetService,
    private financialGoalService: FinancialGoalService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadFinancialContext();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  initForm() {
    this.chatForm = this.fb.group({
      prompt: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  loadFinancialContext() {
    // Load recent expenses
    this.expenseService.getExpenses().subscribe({
      next: (response) => {
        if (response.status === 200) {
          const expenses = response.data?.$values || response.data || [];
          this.financialContext.recentExpenses = expenses.slice(0, 20); // Last 20 expenses
          this.financialContext.totalMonthlyExpenses = this.calculateMonthlyExpenses(expenses);
        }
      },
      error: (error) => console.error('Error loading expenses:', error)
    });

    // Load budgets
    this.budgetService.getBudgets().subscribe({
      next: (response) => {
        if (response.status === 200) {
          const budgets = response.data?.$values || response.data || [];
          this.financialContext.activeBudgets = budgets;
          this.financialContext.totalBudgetAmount = budgets.reduce((sum: number, budget: any) => sum + budget.amount, 0);
        }
      },
      error: (error) => console.error('Error loading budgets:', error)
    });

    // Load financial goals
    this.financialGoalService.getFinancialGoals().subscribe({
      next: (response) => {
        if (response.status === 200) {
          const goals = response.data?.$values || response.data || [];
          this.financialContext.financialGoals = goals;
          this.financialContext.completedGoals = goals.filter((goal: any) => this.isGoalCompleted(goal)).length;
        }
      },
      error: (error) => console.error('Error loading goals:', error)
    });

    // Load categories
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.financialContext.categories = response.data?.$values || response.data || [];
        }
      },
      error: (error) => console.error('Error loading categories:', error)
    });
  }

  calculateMonthlyExpenses(expenses: any[]): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }

  isGoalCompleted(goal: any): boolean {
    const currentAmount = goal.contributions?.reduce((sum: number, contrib: any) => sum + contrib.amount, 0) || 0;
    return currentAmount >= goal.targetAmount;
  }

  sendMessage() {
    if (this.chatForm.invalid || this.isProcessing) {
      return;
    }

    const prompt = this.chatForm.get('prompt')?.value.trim();
    if (!prompt) {
      return;
    }

    // Add user message
    this.addMessage('user', prompt);

    // Clear form
    this.chatForm.get('prompt')?.setValue('');

    // Process with AI
    this.processAIRequest(prompt);
  }

  askQuickQuestion(prompt: string) {
    if (this.isProcessing) {
      return;
    }

    // Add user message
    this.addMessage('user', prompt);

    // Process with AI
    this.processAIRequest(prompt);
  }

  processAIRequest(prompt: string) {
    this.isProcessing = true;

    const user = this.authService.getUserData();
    if (!user?.id) {
      this.addMessage('ai', 'Sorry, I need you to be logged in to help you with your finances.');
      this.isProcessing = false;
      return;
    }

    // Prepare context if enabled
    let context = {};
    if (this.includeContext) {
      context = {
        recentExpenses: this.financialContext.recentExpenses?.slice(0, 10), // Limit to avoid large payloads
        activeBudgets: this.financialContext.activeBudgets,
        financialGoals: this.financialContext.financialGoals,
        categories: this.financialContext.categories,
        summary: {
          totalMonthlyExpenses: this.financialContext.totalMonthlyExpenses,
          totalBudgetAmount: this.financialContext.totalBudgetAmount,
          completedGoals: this.financialContext.completedGoals,
          activeGoals: this.financialContext.financialGoals?.length || 0,
          totalCategories: this.financialContext.categories?.length || 0
        }
      };
    }

    // Prepare history if not ignoring
    let history: string[] = [];
    if (!this.ignoreHistory && this.messages.length > 1) {
      history = this.messages
        .slice(-10) // Last 10 messages to avoid large payloads
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
    }

    const request: McpProcessRequest = {
      prompt: prompt,
      userId: user.id,
      context: context,
      history: history,
      ignoreHistory: this.ignoreHistory
    };

    this.aiAssistantService.processPrompt(request).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        
        // Handle the actual response structure from your C# backend
        // The AI response is in the 'response' field, not 'data'
        if (response.data?.response) {
          // AI response is in response.data.response
          this.addMessage('ai', response.data.response);
        } else if (response.data && typeof response.data === 'string') {
          // AI response is directly in response.data as string
          this.addMessage('ai', response.data);
        } else if (response.response) {
          // AI response is in response.response (direct from backend)
          this.addMessage('ai', response.response);
        } else if (response.error) {
          // There's an actual error
          this.addMessage('ai', `Error: ${response.error}`);
        } else {
          // Fallback message
          this.addMessage('ai', 'I received your message but couldn\'t generate a proper response. Please try asking in a different way.');
        }
      },
      error: (error) => {
        console.error('AI Assistant Error:', error);
        this.isProcessing = false;
        
        // Check if there's a response in the error object
        if (error.error?.response) {
          this.addMessage('ai', error.error.response);
          return;
        }
        
        // Check for specific API key errors
        if (error.error?.error?.includes('API Key') || error.error?.error?.includes('PERMISSION_DENIED')) {
          this.addMessage('ai', '🔑 The AI service needs to be configured with a Google Gemini API key. Please contact your administrator to set this up.');
          return;
        }
        
        // Provide helpful fallback response
        let fallbackResponse = "I'm having trouble connecting to the AI service right now. ";
        
        if (prompt.toLowerCase().includes('expense')) {
          fallbackResponse += `Based on your recent data, you have ${this.financialContext.recentExpenses?.length || 0} expenses recorded.`;
        } else if (prompt.toLowerCase().includes('budget')) {
          fallbackResponse += `You currently have ${this.financialContext.activeBudgets?.length || 0} active budgets.`;
        } else if (prompt.toLowerCase().includes('goal')) {
          fallbackResponse += `You have ${this.financialContext.financialGoals?.length || 0} financial goals set up.`;
        } else {
          fallbackResponse += "Please try again later or check your internet connection.";
        }
        
        this.addMessage('ai', fallbackResponse);
      }
    });
  }

  addMessage(type: 'user' | 'ai', content: string) {
    this.messages.push({
      type: type,
      content: content,
      timestamp: new Date()
    });
  }

  clearChat() {
    if (this.messages.length === 0) {
      return;
    }

    this.alertService.confirmDialog({
      title: 'Clear Chat',
      text: 'Are you sure you want to clear the chat history?',
      confirmButtonText: 'Clear',
      cancelButtonText: 'Cancel'
    }).then((confirmed) => {
      if (confirmed) {
        this.messages = [];
        this.alertService.sweetAlertIt('Chat cleared successfully!', 'Success!');
      }
    });
  }

  toggleContext() {
    this.includeContext = !this.includeContext;
    
    if (this.includeContext) {
      this.loadFinancialContext(); // Refresh context when enabled
      this.alertService.sweetAlertIt('Context mode enabled. AI will now use your financial data.', 'Context Enabled!', 'info');
    } else {
      this.alertService.sweetAlertIt('Context mode disabled. AI responses will be general.', 'Context Disabled!', 'info');
    }
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      try {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      } catch (err) {
        console.error('Could not scroll to bottom:', err);
      }
    }
  }
}