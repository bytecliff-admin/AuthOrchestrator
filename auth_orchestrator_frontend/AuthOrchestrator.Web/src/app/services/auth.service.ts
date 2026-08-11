import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TokenService } from './token.service';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const LOGOUT_BROADCAST_KEY = 'auth:logout-event';
const LOGIN_BROADCAST_KEY = 'auth:login-event';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'https://localhost:7218/api/auth';

  private isAuthenticated$ = new BehaviorSubject<boolean>(this.tokenService.hasTokens());
  /** Emits whenever a forced logout happens (idle timeout, refresh failure, etc.) */
  readonly forcedLogout$ = new Subject<'idle' | 'refresh-failed' | 'manual'>();

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private router: Router,
    private zone: NgZone
  ) {
    // Keep multiple tabs in sync: if one tab logs out or logs in, mirror it here.
    window.addEventListener('storage', (event) => this.onStorageEvent(event));
  }

  get authenticated$(): Observable<boolean> {
    return this.isAuthenticated$.asObservable();
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((res) => {
        this.tokenService.setTokens(res.accessToken, res.refreshToken);
        this.isAuthenticated$.next(true);
        localStorage.setItem(LOGIN_BROADCAST_KEY, Date.now().toString());
      })
    );
  }

  /** Called by the interceptor - kept here so refresh logic lives in one place. */
  refreshTokens(): Observable<TokenResponse> {
    const accessToken = this.tokenService.getAccessToken();
    const refreshToken = this.tokenService.getRefreshToken();

    return this.http
      .post<TokenResponse>(`${this.baseUrl}/refresh-token`, { accessToken, refreshToken })
      .pipe(
        tap((res) => this.tokenService.setTokens(res.accessToken, res.refreshToken)),
        catchError((err) => {
          this.logout('refresh-failed');
          return throwError(() => err);
        })
      );
  }

  logout(reason: 'idle' | 'refresh-failed' | 'manual' = 'manual', navigate = true): void {
    const refreshToken = this.tokenService.getRefreshToken();
    this.tokenService.clearTokens();
    this.isAuthenticated$.next(false);
    this.forcedLogout$.next(reason);

    // Broadcast to other tabs so they clear state too.
    localStorage.setItem(LOGOUT_BROADCAST_KEY, Date.now().toString());

    // Best-effort server-side revoke; ignore failures, we're logging out regardless.
    if (refreshToken) {
      this.http.post(`${this.baseUrl}/logout`, { refreshToken }).subscribe({ error: () => {} });
    }

    if (navigate) {
      this.zone.run(() => this.router.navigate(['/login'], { queryParams: { reason } }));
    }
  }

  isAuthenticated(): boolean {
    return this.tokenService.hasTokens();
  }

  private onStorageEvent(event: StorageEvent): void {
    if (event.key === LOGOUT_BROADCAST_KEY) {
      // Another tab logged out - mirror it here without re-broadcasting.
      if (this.isAuthenticated$.value) {
        this.tokenService.clearTokens();
        this.isAuthenticated$.next(false);
        this.zone.run(() => this.router.navigate(['/login']));
      }
    }
    if (event.key === LOGIN_BROADCAST_KEY) {
      // Another tab logged in - pick up its tokens (already in sessionStorage
      // only per-tab, so for full cross-tab session sharing switch token
      // storage to localStorage or a shared cookie - see README).
      this.isAuthenticated$.next(this.tokenService.hasTokens());
    }
  }
}
