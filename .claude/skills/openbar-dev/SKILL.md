# Skill : openbar-dev

Génère du code pour le projet OpenBar en respectant les conventions existantes et l'état actuel de l'implémentation.

## Quand utiliser ce skill

- "Ajoute une feature X au projet"
- "Crée le CRUD pour [entité]"
- "Génère le composant Ionic/Angular pour [feature]"
- "Ajoute l'endpoint [action]"
- "Implémente [feature] côté backend/frontend"
- "Corrige le bug [X]"

---

## Règle obligatoire — Lier chaque tâche à un ticket GitHub

**Toute tâche de développement ou de design DOIT être liée à une issue GitHub et mise à jour au fil de l'avancement.**

### Workflow à suivre systématiquement

#### 1. Avant de commencer
- Chercher l'issue correspondante sur le board : https://github.com/users/FunWarry/projects/3/views/1
- Si l'issue existe → la passer en **"In progress"** via GraphQL :
```bash
# Récupérer le node_id de l'issue et son item_id dans le board, puis :
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwHOBOlRss4Bac05"
    itemId: "<ITEM_ID>"
    fieldId: "PVTSSF_lAHOBOlRss4Bac05zhVUX3s"
    value: { singleSelectOptionId: "47fc9ee4" }
  }) { projectV2Item { id } }
}'
```
- Si l'issue n'existe pas → la créer avec `gh issue create` ou l'outil MCP `mcp__plugin_github_github__issue_write`, puis l'ajouter au board

#### 2. Pendant le travail
- Poster un commentaire sur l'issue avec l'avancement si la tâche est longue :
```bash
gh issue comment <NUMERO> --repo FunWarry/Open-Bar --body "🔄 En cours : [description de ce qui a été fait]"
```

#### 3. À la fin
- Passer l'issue en **"In review"** si une relecture est nécessaire, sinon directement **"Done"** :
```bash
# Done : singleSelectOptionId = "98236657"
# In review : singleSelectOptionId = "df73e18b"
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwHOBOlRss4Bac05"
    itemId: "<ITEM_ID>"
    fieldId: "PVTSSF_lAHOBOlRss4Bac05zhVUX3s"
    value: { singleSelectOptionId: "98236657" }
  }) { projectV2Item { id } }
}'
```
- Poster un commentaire de clôture sur l'issue résumant ce qui a été fait

### IDs du Project Board (référence rapide)

| Champ | ID |
|-------|----|
| Project | `PVT_kwHOBOlRss4Bac05` |
| Status field | `PVTSSF_lAHOBOlRss4Bac05zhVUX3s` |
| Priority field | `PVTSSF_lAHOBOlRss4Bac05zhVUX7w` |
| Size field | `PVTSSF_lAHOBOlRss4Bac05zhVUX70` |

| Statut | Option ID |
|--------|-----------|
| Backlog | `f75ad846` |
| Ready | `61e4505c` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |

| Priorité | Option ID |
|----------|-----------|
| P0 | `79628723` |
| P1 | `0a877460` |
| P2 | `da944a9c` |

### Trouver l'item_id d'une issue dans le board
```bash
# Remplacer <ISSUE_NODE_ID> par le node_id de l'issue GitHub
gh api graphql -f query='
{
  user(login: "FunWarry") {
    projectV2(number: 3) {
      items(first: 100) {
        nodes {
          id
          content {
            ... on Issue { number title }
          }
        }
      }
    }
  }
}'
```

---

## Contexte projet

Application de gestion de bar temps réel. Trois rôles métier : **SERVEUR** (prise de commande), **BARMAN** (préparation), **MANAGER** (supervision). Plus un rôle technique **ADMIN**.

**Kanban** : https://github.com/users/FunWarry/projects/3/views/1

### Cycle de vie d'une commande
```
EN_ATTENTE → EN_PREPARATION → PRET → LIVREE → REGLEE
                                            ↘ ANNULEE
```

### Bugs actifs à ne pas aggraver
- `dateLivraison` est mis sur `PRET` au lieu de `LIVREE` dans `CommandeService.changerStatut()` — ne pas copier ce pattern
- Le `WebSocketService` frontend est **vide** — ne pas l'appeler sans l'avoir implémenté
- `Facture.numero` n'est jamais généré — si on crée une facture, il faut générer le numéro

---

## Conventions backend (Spring Boot 3 / Java 22)

### Modèle JPA
```java
@Data
@Entity
@Table(name = "ma_table")
public class MonEntite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // champs métier...

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

### Repository
```java
public interface MonEntiteRepository extends JpaRepository<MonEntite, Long> {
    // méthodes dérivées Spring Data si besoin
    Optional<MonEntite> findByNom(String nom);
}
```

### Service
```java
@Service
@Transactional
public class MonEntiteService {
    private final MonEntiteRepository repo;

    // INJECTION PAR CONSTRUCTEUR — jamais @Autowired sur champ
    public MonEntiteService(MonEntiteRepository repo) {
        this.repo = repo;
    }

    public List<MonEntite> getAll() {
        return repo.findAll();
    }

    public MonEntite getById(Long id) {
        return repo.findById(id)
            .orElseThrow(() -> new RuntimeException("MonEntite non trouvée : " + id));
    }

    @Transactional
    public MonEntite create(MonEntite entity) {
        return repo.save(entity);
    }

    @Transactional
    public MonEntite update(Long id, MonEntite details) {
        MonEntite existing = getById(id);
        // copier les champs métier
        return repo.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }
}
```

### Controller
```java
@RestController
@RequestMapping("/api/mon-entite")
public class MonEntiteController {
    private final MonEntiteService service;

    public MonEntiteController(MonEntiteService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<MonEntite>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MonEntite> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<MonEntite> create(@RequestBody MonEntite entity) {
        return ResponseEntity.ok(service.create(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MonEntite> update(@PathVariable Long id, @RequestBody MonEntite entity) {
        return ResponseEntity.ok(service.update(id, entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

### Sécurité backend
Rôles disponibles : `ADMIN`, `SERVEUR`, `BARMEN` (MANAGER à venir)

Pour restreindre un endpoint, utiliser `@PreAuthorize` ou la config dans `SecurityConfig` :
```java
@PreAuthorize("hasAnyRole('ADMIN', 'BARMEN')")
public ResponseEntity<MonEntite> create(...) { ... }
```

### Notifier via WebSocket après une action
```java
// Injecter NotificationService dans le service métier
private final NotificationService notificationService;

// Après une action importante :
notificationService.notifierNouvelleCommande(commande);
// ou :
messagingTemplate.convertAndSend("/topic/mon-topic", payload);
```

### Schema SQL
Ajouter la table dans `backend/src/main/resources/schema.sql` :
```sql
CREATE TABLE IF NOT EXISTS ma_table (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    -- champs métier...
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## Conventions frontend (Angular 19 + Ionic 8)

> **Ionic uniquement** — Angular Material est en cours de migration. Ne pas ajouter de nouveaux composants `mat-*`.

### Structure des features
```
features/<nom>/
├── <nom>-list/     — liste (ion-list ou ion-grid)
├── <nom>-form/     — création/édition (reactive forms + ion-input)
└── <nom>-detail/   — vue détail (optionnel)
```

### Service HTTP
```typescript
@Injectable({ providedIn: 'root' })
export class MonEntiteService {
  private readonly API = 'http://localhost:8080/api/mon-entite';

  constructor(private http: HttpClient) {}

  getAll(): Observable<MonEntite[]> {
    return this.http.get<MonEntite[]>(this.API);
  }

  getById(id: number): Observable<MonEntite> {
    return this.http.get<MonEntite>(`${this.API}/${id}`);
  }

  create(entity: Partial<MonEntite>): Observable<MonEntite> {
    return this.http.post<MonEntite>(this.API, entity);
  }

  update(id: number, entity: Partial<MonEntite>): Observable<MonEntite> {
    return this.http.put<MonEntite>(`${this.API}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
```

### Composant list (Ionic)
```typescript
@Component({
  selector: 'app-mon-entite-list',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './mon-entite-list.component.html',
})
export class MonEntiteListComponent implements OnInit {
  items = signal<MonEntite[]>([]);
  loading = signal(false);

  constructor(
    private service: MonEntiteService,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.showError('Erreur de chargement'); },
    });
  }

  private async showError(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 3000, color: 'danger' });
    await toast.present();
  }
}
```

Template Ionic :
```html
<ion-header>
  <ion-toolbar>
    <ion-title>Mon Entité</ion-title>
    <ion-buttons slot="end">
      <ion-button routerLink="new"><ion-icon name="add"></ion-icon></ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content>
  <ion-list *ngIf="!loading()">
    <ion-item *ngFor="let item of items()" [routerLink]="[item.id]">
      <ion-label>{{ item.nom }}</ion-label>
      <ion-note slot="end">...</ion-note>
    </ion-item>
  </ion-list>
  <ion-spinner *ngIf="loading()"></ion-spinner>
</ion-content>
```

### Composant form (Ionic)
```typescript
@Component({
  selector: 'app-mon-entite-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './mon-entite-form.component.html',
})
export class MonEntiteFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private service: MonEntiteService,
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      nom: ['', Validators.required],
      // autres champs...
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.service.getById(+id).subscribe(e => this.form.patchValue(e));
    }
  }

  submit() {
    if (this.form.invalid) return;
    const id = this.route.snapshot.paramMap.get('id');
    const obs = this.isEdit
      ? this.service.update(+id!, this.form.value)
      : this.service.create(this.form.value);
    obs.subscribe({
      next: () => { this.router.navigate(['../']); },
      error: () => this.showError('Erreur lors de la sauvegarde'),
    });
  }

  private async showError(msg: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 3000, color: 'danger' });
    await toast.present();
  }
}
```

### Route dans `app.routes.ts`
```typescript
{
  path: 'mon-entite',
  loadComponent: () => import('./features/mon-entite/mon-entite-list/mon-entite-list.component')
    .then(m => m.MonEntiteListComponent),
  canActivate: [AuthGuard],
},
{
  path: 'mon-entite/new',
  loadComponent: () => import('./features/mon-entite/mon-entite-form/mon-entite-form.component')
    .then(m => m.MonEntiteFormComponent),
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: ['ADMIN'] },
},
```

### State management
- **NgRx** uniquement pour l'auth — ne pas ajouter de stores NgRx pour les ressources métier sans raison
- Pour les composants : `signal<T>()` ou propriétés de composant
- Pour le partage entre composants : `BehaviorSubject` dans un service

### Sécurité frontend
```typescript
// Guard de rôle
canActivate: [AuthGuard, RoleGuard],
data: { roles: ['ADMIN'] }

// Sélecteurs disponibles dans le store
selectIsAuthenticated
selectCurrentUser
selectIsAdmin
selectIsBarmen
// À créer : selectIsManager, selectIsServeur
```

---

## Services frontend existants

| Service | Fichier | État |
|---------|---------|------|
| AuthService | `core/services/auth.service.ts` | ✅ Complet |
| NavigationService | `core/services/navigation.service.ts` | ⚠️ Partiel |
| WebSocketService | `core/services/websocket.service.ts` | ❌ Vide |
| CocktailService | — | ❌ À créer |
| CommandeService | — | ❌ À créer |
| TableService | — | ❌ À créer |
| IngredientService | — | ❌ À créer |
| FactureService | — | ❌ À créer |
| UserService | — | ❌ À créer |

---

## WebSocketService — squelette à compléter

```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private client!: Client;

  connect(token: string) {
    this.client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
    });
    this.client.activate();
  }

  subscribe<T>(topic: string): Observable<T> {
    return new Observable(observer => {
      this.client.subscribe(topic, msg => {
        observer.next(JSON.parse(msg.body) as T);
      });
    });
  }

  disconnect() {
    this.client?.deactivate();
  }
}
// Dépendance à ajouter : @stomp/stompjs
```

---

## Checklist avant de livrer le code

### Backend
- [ ] Modèle JPA avec `@PrePersist`/`@PreUpdate`
- [ ] Table ajoutée dans `schema.sql`
- [ ] Repository étend `JpaRepository`
- [ ] Service : injection par constructeur + `@Transactional` sur les writes
- [ ] Controller : `@RestController` + `@RequestMapping`
- [ ] Sécurité : vérifier si l'endpoint doit être restreint par rôle
- [ ] NotificationService appelé si temps réel requis

### Frontend
- [ ] Composant Angular **standalone** (`standalone: true`)
- [ ] UI en **Ionic** (pas Angular Material)
- [ ] Service Angular avec `HttpClient` + `Observable`
- [ ] Gestion erreur avec `ion-toast`
- [ ] Route **lazy-loadée** dans `app.routes.ts`
- [ ] Guard appliqué si route protégée
- [ ] Lien dans la navbar si pertinent
