import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {User} from '../../../../core/models/user.model';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-delete-user-dialog',
  template: `
    <h2 mat-dialog-title>Confirmer la suppression</h2>
    <mat-dialog-content>
      <p>
        Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{{ data.username }}</strong> ?
      </p>
      <p class="warning">
        Cette action est irréversible et supprimera définitivement toutes les données associées à cet utilisateur.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">
        <mat-icon>delete</mat-icon>
        Supprimer
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
    }

    .warning {
      color: #f44336;
      font-size: 0.9em;
      margin-top: 16px;
    }

    mat-icon {
      margin-right: 8px;
    }
  `],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule]
})
export class DeleteUserDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User
  ) {
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
