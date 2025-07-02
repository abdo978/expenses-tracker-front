import { environment } from './../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError, map } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { SessionService } from '../core/session.service';

// Interfaces based on your API documentation
export interface LoginCommand {
  email: string;
  password: string;
}

export interface RegisterCommand {
  email: string;
  userName: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  token: string;
  user: any;
}

export interface User {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private apiUrl = environment.api_url || 'http://localhost:5000';

  constructor(
    private http: HttpClient,
    private router: Router,
    private sessionService: SessionService
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.getUserData());
    this.currentUser = this.currentUserSubject.asObservable();
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    return !!token;
  }

  /**
   * Login user with email and password
   * API: POST /api/Auth/login
   */
  login(credentials: LoginCommand): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}api/Auth/login`, credentials).pipe(
      tap((response: LoginResponse) => {
        if (response?.token) {
          this.storeUserData(response);
        }
      }),
      catchError((error) => {
        console.error('Login failed', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Register new user
   * API: POST /api/Auth/register
   */
  register(userData: RegisterCommand): Observable<any> {
    return this.http.post(`${this.apiUrl}api/Auth/register`, userData).pipe(
      catchError((error) => {
        console.error('Registration failed', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current user information
   * API: GET /api/Auth/me
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}api/Auth/me`).pipe(
      tap((user: User) => {
        // Update current user data
        this.sessionService.setItem('user_data', JSON.stringify(user), true);
        this.currentUserSubject.next(user);
      }),
      catchError((error) => {
        console.error('Failed to get current user', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user and clear session
   * Note: Your API doesn't seem to have a logout endpoint, 
   * so we'll just clear local storage and redirect
   */
  logout(): void {
    // Clear all stored data
    this.sessionService.removeItem('token');
    this.sessionService.removeItem('user_data');
    this.currentUserSubject.next(null);
    
    // Redirect to login page
    this.router.navigate(['/auth/login']);
  }

  /**
   * Store user data and token in session/local storage
   */
  public storeUserData(response: LoginResponse): void {
    const { token, user } = response;
    this.sessionService.setItem('token', token, true);
    this.sessionService.setItem('user_data', JSON.stringify(user), true);
    this.currentUserSubject.next(user);
  }

  /**
   * Get stored user data
   */
  public getUserData(): User | any {
    const userData = this.sessionService.getItem('user_data');
    if (userData) {
      try {
        return JSON.parse(userData) as User;
      } catch (error) {
        console.error('Error parsing user data', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    return this.sessionService.getItem('token');
  }

  /**
   * Check if token is expired (optional enhancement)
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp;
      return (Math.floor((new Date).getTime() / 1000)) >= expiry;
    } catch (error) {
      return true;
    }
  }

  /**
   * Refresh user data from server
   */
  refreshUserData(): Observable<User> {
    return this.getCurrentUser();
  }
}