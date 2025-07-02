import { environment } from './../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  constructor(private http: HttpClient) {}

  get(path: string, params: HttpParams = new HttpParams()): Observable<any> {
    return this.http
      .get(`${environment.api_url}${path}`, { headers: this.headers, params, observe: 'response' })
      .pipe(
        map((response: HttpResponse<any>) => ({
          status: response.status,
          data: response.body,
        })),
        catchError(this.handleError)
      );
  }

  post(path: string, body: any): Observable<any> {
    return this.http
      .post(`${environment.api_url}${path}`, body, { headers: this.headers, observe: 'response' })
      .pipe(
        map((response: HttpResponse<any>) => ({
          status: response.status,
          data: response.body,
        })),
        catchError(this.handleError)
      );
  }

  put(path: string, body: any): Observable<any> {
    return this.http
      .put(`${environment.api_url}${path}`, body, { headers: this.headers, observe: 'response' })
      .pipe(
        map((response: HttpResponse<any>) => ({
          status: response.status,
          data: response.body,
        })),
        catchError(this.handleError)
      );
  }

  delete(path: string, params: HttpParams = new HttpParams()): Observable<any> {
    return this.http
      .delete(`${environment.api_url}${path}`, { headers: this.headers, params, observe: 'response' })
      .pipe(
        map((response: HttpResponse<any>) => ({
          status: response.status,
          data: response.body,
        })),
        catchError(this.handleError)
      );
  }

  upload(path: string, body: any): Observable<any> {
    return this.http
      .post(`${environment.api_url}${path}`, body, { 
        observe: 'response'
      })
      .pipe(
        map((response: HttpResponse<any>) => ({
          status: response.status,
          data: response.body,
        })),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(error);
  }
}