import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { IdleTimeoutService } from '../../services/idle-timeout.service';
import { AuthService } from '../../services/auth.service';

export interface SessionExpiryDialogData {
  countdownSeconds: number;
}

@Component({
  selector: 'app-session-expiry-dialog',
  templateUrl: './session-expiry-dialog.component.html',
  styleUrls: ['./session-expiry-dialog.component.scss'],
})
export class SessionExpiryDialogComponent implements OnInit, OnDestroy {
  secondsRemaining: number;
  private subs = new Subscription();

  constructor(
    private dialogRef: MatDialogRef<SessionExpiryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SessionExpiryDialogData,
    private idleTimeoutService: IdleTimeoutService,
    private authService: AuthService
  ) {
    this.secondsRemaining = data.countdownSeconds;
  }

  ngOnInit(): void {
    this.subs.add(
      this.idleTimeoutService.onCountdownTick$.subscribe((seconds) => {
        this.secondsRemaining = seconds;
      })
    );

    this.subs.add(
      this.idleTimeoutService.onTimeout$.subscribe(() => {
        this.dialogRef.close('timeout');
        this.authService.logout('idle');
      })
    );
  }

  continueSession(): void {
    this.idleTimeoutService.extendSession();
    this.dialogRef.close('continued');
  }

  logoutNow(): void {
    this.dialogRef.close('manual-logout');
    this.authService.logout('manual');
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
