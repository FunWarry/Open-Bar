import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonBadge, IonButton, IonIcon, IonChip, IonLabel
} from '@ionic/angular/standalone';
import { CommandeCardComponent } from '../../../app/features/dashboard-barman/components/commande-card/commande-card.component';
import { CommandeView } from '../../../app/features/dashboard-barman/models/commande-view.model';

const makeCommande = (overrides: Partial<CommandeView> = {}): CommandeView => ({
  id: 1,
  tableNom: 'Table 1',
  serveurNom: 'Alice',
  statut: 'EN_ATTENTE',
  prioritaire: false,
  dateCommande: new Date(),
  items: [],
  ...overrides
});

describe('CommandeCardComponent', () => {
  let component: CommandeCardComponent;
  let fixture: ComponentFixture<CommandeCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommandeCardComponent,
        CommonModule,
        IonCard, IonCardHeader, IonCardTitle, IonCardContent,
        IonBadge, IonButton, IonIcon, IonChip, IonLabel
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommandeCardComponent);
    component = fixture.componentInstance;
    component.commande = makeCommande();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // --- tempsEcoule ---

  it('tempsEcoule affiche les minutes pour une commande récente', () => {
    const now = new Date(Date.now() - 5 * 60000); // 5 min ago
    component.commande = makeCommande({ dateCommande: now });
    (component as any).updateTimer();
    expect(component.tempsEcoule).toBe('5 min');
  });

  it('tempsEcoule affiche le format hhmm pour une commande de plus d\'une heure', () => {
    const now = new Date(Date.now() - 90 * 60000); // 90 min ago
    component.commande = makeCommande({ dateCommande: now });
    (component as any).updateTimer();
    expect(component.tempsEcoule).toBe('1h30');
  });

  it('ngOnDestroy unsubscribe le timer', () => {
    const sub = (component as any).timerSub;
    if (sub) {
      spyOn(sub, 'unsubscribe').and.callThrough();
    }
    component.ngOnDestroy();
    if (sub) {
      expect(sub.unsubscribe).toHaveBeenCalled();
    } else {
      expect(true).toBeTrue(); // pas de sub créé, pas d'erreur
    }
  });

  // --- lisereColor ---

  it('lisereColor retourne orange pour EN_ATTENTE', () => {
    component.commande = makeCommande({ statut: 'EN_ATTENTE' });
    expect(component.lisereColor).toBe('#f4a52a');
  });

  it('lisereColor retourne bleu pour EN_PREPARATION', () => {
    component.commande = makeCommande({ statut: 'EN_PREPARATION' });
    expect(component.lisereColor).toBe('#2ba8e8');
  });

  it('lisereColor retourne vert pour PRET', () => {
    component.commande = makeCommande({ statut: 'PRET' });
    expect(component.lisereColor).toBe('#2fbf6b');
  });

  it('lisereColor retourne gris par defaut pour un statut inconnu', () => {
    component.commande = makeCommande({ statut: 'LIVREE' as any });
    expect(component.lisereColor).toBe('#7e87a8');
  });

  // --- statutLabel ---

  it('statutLabel retourne "⚡ Priority" si prioritaire', () => {
    component.commande = makeCommande({ prioritaire: true, statut: 'EN_ATTENTE' });
    expect(component.statutLabel).toBe('⚡ Priority');
  });

  it('statutLabel retourne "Pending" pour EN_ATTENTE non prioritaire', () => {
    component.commande = makeCommande({ statut: 'EN_ATTENTE', prioritaire: false });
    expect(component.statutLabel).toBe('Pending');
  });

  it('statutLabel retourne "In Progress" pour EN_PREPARATION', () => {
    component.commande = makeCommande({ statut: 'EN_PREPARATION' });
    expect(component.statutLabel).toBe('In Progress');
  });

  it('statutLabel retourne "Ready" pour PRET', () => {
    component.commande = makeCommande({ statut: 'PRET' });
    expect(component.statutLabel).toBe('Ready');
  });

  it('statutLabel retourne le statut brut pour un statut inconnu', () => {
    component.commande = makeCommande({ statut: 'LIVREE' as any });
    expect(component.statutLabel).toBe('LIVREE');
  });

  // --- statutBadgeClass ---

  it('statutBadgeClass retourne "badge--priority" si prioritaire', () => {
    component.commande = makeCommande({ prioritaire: true });
    expect(component.statutBadgeClass).toBe('badge--priority');
  });

  it('statutBadgeClass retourne "badge--pending" pour EN_ATTENTE', () => {
    component.commande = makeCommande({ statut: 'EN_ATTENTE' });
    expect(component.statutBadgeClass).toBe('badge--pending');
  });

  it('statutBadgeClass retourne "badge--inprogress" pour EN_PREPARATION', () => {
    component.commande = makeCommande({ statut: 'EN_PREPARATION' });
    expect(component.statutBadgeClass).toBe('badge--inprogress');
  });

  it('statutBadgeClass retourne "badge--ready" pour PRET', () => {
    component.commande = makeCommande({ statut: 'PRET' });
    expect(component.statutBadgeClass).toBe('badge--ready');
  });

  // --- onPrendreEnCharge ---

  it('onPrendreEnCharge emet changerStatut avec statut EN_PREPARATION', () => {
    const emitted: { id: number; statut: string }[] = [];
    component.changerStatut.subscribe((val) => emitted.push(val));
    component.commande = makeCommande({ id: 42 });
    component.onPrendreEnCharge();
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ id: 42, statut: 'EN_PREPARATION' });
  });

  // --- onMarquerPret ---

  it('onMarquerPret emet changerStatut avec statut PRET', () => {
    const emitted: { id: number; statut: string }[] = [];
    component.changerStatut.subscribe((val) => emitted.push(val));
    component.commande = makeCommande({ id: 7 });
    component.onMarquerPret();
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ id: 7, statut: 'PRET' });
  });

  // --- timer interval (fakeAsync) ---

  it('le timer se met a jour toutes les 30 secondes', fakeAsync(() => {
    const pastDate = new Date(Date.now() - 2 * 60000); // 2 min ago
    component.commande = makeCommande({ dateCommande: pastDate });
    component.ngOnInit();
    tick(30000);
    // tempsEcoule doit avoir ete recalcule (au moins 2 min)
    expect(component.tempsEcoule).toMatch(/\d+ min|^\d+h\d{2}$/);
    component.ngOnDestroy();
  }));
});
