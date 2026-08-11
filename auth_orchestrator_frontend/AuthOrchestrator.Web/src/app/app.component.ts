import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { IdleTimeoutService } from './services/idle-timeout.service';
import { SessionDialogService } from './services/session-dialog.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'AuthOrchestrator.Web';
  email = '';
  password = '';
  isAuthenticated = false;
  isLoading = false;
  errorMessage = '';
  infoMessage = '';

  private subs = new Subscription();

  constructor(
    private idleTimeoutService: IdleTimeoutService,
    private sessionDialogService: SessionDialogService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Only track idle time while actually logged in.
    this.subs.add(
      this.authService.authenticated$.subscribe((isAuthed) => {
        this.isAuthenticated = isAuthed;
        if (isAuthed) {
          this.idleTimeoutService.start({ idleMinutes: 15, countdownSeconds: 10 });
        } else {
          this.idleTimeoutService.stop();
          this.sessionDialogService.close();
        }
      })
    );

    this.subs.add(
      this.idleTimeoutService.onIdleWarning$.subscribe(() => {
        this.sessionDialogService.open(10);
      })
    );

    this.subs.add(
      this.idleTimeoutService.onActivityResumed$.subscribe(() => {
        this.sessionDialogService.close();
      })
    );

    // Route navigation counts as activity.
    this.subs.add(
      this.router.events
        .pipe(filter((e) => e instanceof NavigationStart))
        .subscribe(() => this.idleTimeoutService.notifyRouteActivity())
    );

    this.subs.add(
      this.authService.forcedLogout$.subscribe((reason) => {
        if (reason === 'idle') {
          this.infoMessage = 'You were logged out due to inactivity.';
        } else if (reason === 'refresh-failed') {
          this.infoMessage = 'Your session expired. Please sign in again.';
        }
      })
    );
  }

  onEmailInput(event: Event): void {
    this.email = (event.target as HTMLInputElement).value;
  }

  onPasswordInput(event: Event): void {
    this.password = (event.target as HTMLInputElement).value;
  }

  onLogin(): void {
    const email = this.email.trim();
    const password = this.password;

    if (!email || !password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    this.errorMessage = '';
    this.infoMessage = '';
    this.isLoading = true;

    this.subs.add(
      this.authService.login(email, password).subscribe({
        next: () => {
          this.isLoading = false;
          this.password = '';
          this.infoMessage = 'Signed in successfully.';
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Login failed. Please try again.';
        },
      })
    );
  }

  onLogout(): void {
    this.authService.logout('manual', false);
    this.password = '';
    this.infoMessage = 'Signed out.';
    this.errorMessage = '';
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
