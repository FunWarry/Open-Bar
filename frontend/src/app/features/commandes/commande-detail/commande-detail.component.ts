import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import { CurrencyPipe, NgIf } from '@angular/common';
import {MatChip, MatChipsModule} from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
@Component({
    selector: 'app-commande-detail',
    templateUrl: './commande-detail.component.html',
    styleUrls: ['./commande-detail.component.scss'],
    standalone: true,
    imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatIconModule, MatButtonModule, MatSnackBarModule, NgIf, MatChip, MatChipsModule, CurrencyPipe, MatTableModule]
})
export class CommandeDetailComponent implements OnInit {
  commandeId: number;
  commande: any; // TODO: Remplacer par le type approprié

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private snackBar: MatSnackBar
  ) {
    this.commandeId = +this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit(): void {
    // TODO: Charger les détails de la commande
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'EN_ATTENTE':
        return 'warn';
      case 'EN_PREPARATION':
        return 'accent';
      case 'PRETE':
        return 'primary';
      case 'SERVIE':
        return 'primary';
      default:
        return 'primary';
    }
  }

  onEdit(): void {
    this.router.navigate(['/commandes', this.commandeId, 'edit']);
  }

  onDelete(): void {
    // TODO: Implémenter la logique de suppression
    this.snackBar.open('Commande supprimée avec succès', 'Fermer', {
      duration: 3000
    });
    this.router.navigate(['/commandes']);
  }
}
