import { Inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SessionExpiryDialogComponent } from '../shared/components/session-expiry-dialog.component';

/**
 * Thin wrapper around MatDialog so the rest of the app never imports
 * MatDialog directly for this flow, and so we guarantee only one instance
 * of the expiry dialog is ever open at a time.
 */
@Injectable({ providedIn: 'root' })
export class SessionDialogService {
  private dialogRef: MatDialogRef<SessionExpiryDialogComponent> | null = null;

  constructor(@Inject(MatDialog) private dialog: MatDialog) {}

  open(countdownSeconds: number): MatDialogRef<SessionExpiryDialogComponent> {
    if (this.dialogRef) {
      return this.dialogRef;
    }

    this.dialogRef = this.dialog.open(SessionExpiryDialogComponent, {
      disableClose: true,
      width: '420px',
      data: { countdownSeconds },
    });

    this.dialogRef.afterClosed().subscribe(() => {
      this.dialogRef = null;
    });

    return this.dialogRef;
  }

  close(): void {
    this.dialogRef?.close();
    this.dialogRef = null;
  }

  isOpen(): boolean {
    return !!this.dialogRef;
  }
}
