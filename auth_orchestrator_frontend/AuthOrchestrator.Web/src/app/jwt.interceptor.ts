import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, finalize, switchMap, take } from 'rxjs/operators';
import { TokenService } from './services/token.service';
import { AuthService } from './services/auth.service';

const AUTH_EXCLUDED_PATHS = ['/api/auth/login', '/api/auth/refresh-token'];

/**
 * Handles two things:
 *  1. Proactive refresh - if the access token is already expired/expiring
 *     before we even send the request, refresh first, then send.
 *  2. Reactive refresh - if a request still comes back 401 (token expired
 *     mid-flight, clock skew, etc.), refresh once and retry it.
 *
 * Concurrency: `refreshInProgress$` acts as a gate. The first request that
 * needs a refresh flips it to "refreshing" and kicks off the actual HTTP
 * call. Every other request that arrives while a refresh is already running
 * just waits on `refreshInProgress$` for the new token instead of firing its
 * own refresh call - so N simultaneous 401s produce exactly 1 refresh call.
 */
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshInProgress$ = new BehaviorSubject<string | null>(null);

  constructor(private tokenService: TokenService, private authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isExcluded(req)) {
      return next.handle(req);
    }

    const accessToken = this.tokenService.getAccessToken();

    // Proactive check: don't even send a request we know will 401.
    if (accessToken && this.tokenService.isExpiredOrExpiring(accessToken)) {
      return this.handleRefresh(req, next);
    }

    const authedReq = this.attachToken(req, accessToken);

    return next.handle(authedReq).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handleRefresh(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handleRefresh(
    originalReq: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshInProgress$.next(null); // mark "no token yet" - queued requests wait

      return this.authService.refreshTokens().pipe(
        switchMap((res) => {
          this.refreshInProgress$.next(res.accessToken);
          return next.handle(this.attachToken(originalReq, res.accessToken));
        }),
        catchError((err) => {
          // AuthService.refreshTokens() already triggers logout on failure.
          return throwError(() => err);
        }),
        finalize(() => {
          this.isRefreshing = false;
        })
      );
    }

    // A refresh is already in flight - wait for it to publish a new token,
    // then replay this request with it. No second HTTP call is made here.
    return this.refreshInProgress$.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => next.handle(this.attachToken(originalReq, token)))
    );
  }

  private attachToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
    if (!token) return req;
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private isExcluded(req: HttpRequest<unknown>): boolean {
    return AUTH_EXCLUDED_PATHS.some((path) => req.url.includes(path));
  }
}

/*
Registration (app.config.ts, standalone bootstrap):

import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

providers: [
  provideHttpClient(withInterceptorsFromDi()),
  { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
]
*/
