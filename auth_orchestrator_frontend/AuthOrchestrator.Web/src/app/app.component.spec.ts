import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';
import { IdleTimeoutService } from './services/idle-timeout.service';
import { SessionDialogService } from './services/session-dialog.service';

describe('AppComponent', () => {
  const authenticated$ = new BehaviorSubject<boolean>(false);
  const forcedLogout$ = new Subject<'idle' | 'refresh-failed' | 'manual'>();

  const authServiceMock = {
    authenticated$,
    forcedLogout$,
    login: jasmine
      .createSpy('login')
      .and.returnValue(of({ accessToken: 'a', refreshToken: 'b', expiresIn: 60 })),
    logout: jasmine.createSpy('logout'),
  };

  const idleTimeoutServiceMock = {
    start: jasmine.createSpy('start'),
    stop: jasmine.createSpy('stop'),
    notifyRouteActivity: jasmine.createSpy('notifyRouteActivity'),
    onIdleWarning$: new Subject<void>(),
    onActivityResumed$: new Subject<void>(),
  };

  const sessionDialogServiceMock = {
    open: jasmine.createSpy('open'),
    close: jasmine.createSpy('close'),
  };

  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: IdleTimeoutService, useValue: idleTimeoutServiceMock },
        { provide: SessionDialogService, useValue: sessionDialogServiceMock },
      ],
    })
  );

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it("should have as title 'AuthOrchestrator.Web'", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('AuthOrchestrator.Web');
  });

  it('should call auth login when onLogin is invoked with valid inputs', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.email = 'user@example.com';
    app.password = 'pass123';

    app.onLogin();

    expect(authServiceMock.login).toHaveBeenCalledWith('user@example.com', 'pass123');
  });

  it('should call auth logout with manual reason', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.onLogout();

    expect(authServiceMock.logout).toHaveBeenCalledWith('manual', false);
  });
});
