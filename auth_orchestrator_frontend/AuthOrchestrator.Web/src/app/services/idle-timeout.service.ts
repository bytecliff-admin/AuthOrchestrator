import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { fromEvent, merge, Subject, Subscription, timer } from 'rxjs';
import { auditTime, takeUntil } from 'rxjs/operators';

export interface IdleConfig {
  /** Minutes of no activity before the warning dialog appears. */
  idleMinutes: number;
  /** Seconds the countdown dialog runs before forcing logout. */
  countdownSeconds: number;
}

const DEFAULT_CONFIG: IdleConfig = {
  idleMinutes: 15,
  countdownSeconds: 10,
};

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'wheel'];

/**
 * Centralized idle-session tracker.
 *
 * Design notes:
 * - A single set of RxJS subscriptions is created once (in `start()`), not
 *   per-component, so there's exactly one set of DOM listeners for the
 *   whole SPA - no duplicate timers no matter how many components exist.
 * - `auditTime` throttles the high-frequency events (mousemove/scroll) so we
 *   don't reset a timer hundreds of times a second.
 * - All internal subscriptions are torn down via a `destroy$` subject so
 *   there's nothing left running if the service itself is ever destroyed
 *   (it won't be, in practice, since it's providedIn: 'root' - but it's
 *   good hygiene and makes this testable in isolation).
 * - DOM listeners run outside Angular's zone (`runOutsideAngular`) so mouse
 *   moves don't trigger change detection; we re-enter the zone only when we
 *   actually need to emit an event the UI cares about (warning/timeout).
 */
@Injectable({ providedIn: 'root' })
export class IdleTimeoutService implements OnDestroy {
  private config: IdleConfig = DEFAULT_CONFIG;

  private idleTimerSub?: Subscription;
  private countdownSub?: Subscription;
  private activitySub?: Subscription;

  private readonly destroy$ = new Subject<void>();
  private started = false;

  /** Emitted when idle period elapses and the warning dialog should show. */
  readonly onIdleWarning$ = new Subject<void>();
  /** Emitted every tick of the countdown, with seconds remaining. */
  readonly onCountdownTick$ = new Subject<number>();
  /** Emitted when the countdown reaches zero - caller should force logout. */
  readonly onTimeout$ = new Subject<void>();
  /** Emitted when activity resumes and the idle timer restarts (dialog should close). */
  readonly onActivityResumed$ = new Subject<void>();

  constructor(private zone: NgZone) {}

  start(config: Partial<IdleConfig> = {}): void {
    if (this.started) {
      // Idempotent: calling start() twice (e.g. app re-init) must not create
      // a second set of listeners/timers.
      this.stop();
    }
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.started = true;

    this.zone.runOutsideAngular(() => {
      const activity$ = merge(
        ...ACTIVITY_EVENTS.map((evt) => fromEvent(document, evt, { passive: true }))
      ).pipe(auditTime(1000), takeUntil(this.destroy$));

      this.activitySub = activity$.subscribe(() => this.resetIdleTimer());
    });

    this.resetIdleTimer();
  }

  stop(): void {
    this.idleTimerSub?.unsubscribe();
    this.countdownSub?.unsubscribe();
    this.activitySub?.unsubscribe();
    this.started = false;
  }

  /** Called by the dialog's "Continue Session" button. */
  extendSession(): void {
    this.countdownSub?.unsubscribe();
    this.resetIdleTimer();
    this.zone.run(() => this.onActivityResumed$.next());
  }

  /** Registers route navigation as activity - call from a router event handler. */
  notifyRouteActivity(): void {
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    this.idleTimerSub?.unsubscribe();
    this.countdownSub?.unsubscribe();

    this.zone.runOutsideAngular(() => {
      this.idleTimerSub = timer(this.config.idleMinutes * 60 * 1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.beginCountdown());
    });
  }

  private beginCountdown(): void {
    this.zone.run(() => this.onIdleWarning$.next());

    let remaining = this.config.countdownSeconds;
    this.zone.runOutsideAngular(() => {
      this.countdownSub = timer(0, 1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.zone.run(() => this.onCountdownTick$.next(remaining));
          if (remaining <= 0) {
            this.countdownSub?.unsubscribe();
            this.zone.run(() => this.onTimeout$.next());
            return;
          }
          remaining -= 1;
        });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stop();
  }
}
