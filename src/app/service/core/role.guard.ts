import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const user = this.authService.getUserData();
    const requiredRole = route.data['role'] as string;

    if (user && user.role === requiredRole) {
      return true;
    }

    // Redirect if the role does not match
    this.router.navigate(['/']);
    return false;
  }
}
