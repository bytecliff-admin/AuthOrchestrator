import { Injectable } from '@angular/core';

interface DecodedJwt {
  exp: number; // seconds since epoch
  sub?: string;
  [key: string]: any;
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Single source of truth for reading/writing tokens.
 *
 * NOTE on storage: sessionStorage/localStorage are both readable by any JS
 * on the page, so they're vulnerable to XSS token theft. The most secure
 * option is an HttpOnly cookie for the refresh token, set by the server,
 * never touched by JS at all (see README). This implementation shows the
 * client-storage approach for teams that can't adopt HttpOnly cookies yet -
 * swap the get/set/clear bodies below if you move to cookies.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  getAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setAccessToken(token: string): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string): void {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  clearTokens(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  hasTokens(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  }

  private decode(token: string): DecodedJwt | null {
    try {
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(normalized)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  getExpiryMs(token: string): number | null {
    const decoded = this.decode(token);
    return decoded ? decoded.exp * 1000 : null;
  }

  /** True if the token is expired, or will expire within `skewMs` (default 30s). */
  isExpiredOrExpiring(token: string | null, skewMs = 30_000): boolean {
    if (!token) return true;
    const expiryMs = this.getExpiryMs(token);
    if (expiryMs === null) return true;
    return Date.now() >= expiryMs - skewMs;
  }
}
