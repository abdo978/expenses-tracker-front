import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface McpProcessRequest {
  prompt: string;
  userId: string;
  context?: any;
  history?: string[];
  ignoreHistory: boolean;
}

export interface AIResponse {
  status: number;
  data?: any;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AIAssistantService {
  private apiUrl = environment.api_url || 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  /**
   * Process a prompt with the AI Agent
   * API: POST /api/AIAgent/process
   */
  processPrompt(request: McpProcessRequest): Observable<AIResponse> {
    return this.http.post<AIResponse>(`${this.apiUrl}api/AIAgent/process`, request);
  }

  /**
   * Process a simple prompt without context
   */
  simplePrompt(prompt: string, userId: string): Observable<AIResponse> {
    const request: McpProcessRequest = {
      prompt: prompt,
      userId: userId,
      context: {},
      history: [],
      ignoreHistory: true
    };

    return this.processPrompt(request);
  }

  /**
   * Process a prompt with financial context
   */
  promptWithContext(prompt: string, userId: string, context: any, history?: string[]): Observable<AIResponse> {
    const request: McpProcessRequest = {
      prompt: prompt,
      userId: userId,
      context: context,
      history: history || [],
      ignoreHistory: false
    };

    return this.processPrompt(request);
  }
}