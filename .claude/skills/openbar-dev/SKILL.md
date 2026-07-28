---
name: openbar-dev
description: |
  Génère du code pour le projet OpenBar en respectant les conventions existantes (Spring Boot 4 backend, Angular 20 + Ionic 8 frontend).

  Quand utiliser ce skill:
  - "Ajoute une feature X au projet"
  - "Crée le CRUD pour [entité]"
  - "Génère le composant Angular pour [feature]"
  - "Ajoute l'endpoint [action]"
  - "Implémente [feature] côté backend/frontend"
---

# Skill : openbar-dev

Génère du code pour le projet OpenBar en respectant les conventions existantes.

## Règle Absolue : Documentation Code Obligatoire & En Anglais 🇬🇧

- **Documentation OBLIGATOIRE sur TOUT code créé ou modifié**
- **TOUTE la documentation (JavaDoc, TSDoc, Swagger/OpenAPI) DOIT ÊTRE RÉDIGÉE EXCLUSIVEMENT EN ANGLAIS**.
- Backend : JavaDoc sur chaque service, controller, DTO (record), security, exception + annotations OpenAPI (`@Tag`, `@Operation`, `@ApiResponse`).
- Frontend : TSDoc sur chaque service Angular, guard, interceptor et store NgRx.

---

## Stack réelle (ne pas se fier aux anciens fichiers)

- **Backend** : Spring Boot **4.0.6** + Java **22** (épinglé) + JJWT **0.12.6** + Springdoc OpenAPI **2.8.9**
- **Frontend** : Angular **20** + Ionic **8.8.11** + NgRx **20** (auth uniquement)
- **Tests backend** : JUnit 5 + Mockito dans `src/test/java/`
- **Tests frontend** : Karma + Jasmine dans `frontend/src/test/` (miroir de `src/app/`)

---

## Avant de générer du code

1. Identifier le périmètre : Backend seul / Frontend seul / Full-stack
2. Vérifier les KIs OpenBar pour les patterns existants (architecture, conventions, modèle de données)
3. Nouvelle entité ou extension d'une entité existante ?

---

## Conventions Backend (Spring Boot 4)

### Modèle JPA
```java
@Data
@Entity
@Table(name = "ma_table")
public class MonEntite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // champs métier

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
```

### Repository
```java
public interface MonEntiteRepository extends JpaRepository<MonEntite, Long> {
    // méthodes dérivées Spring Data si besoin
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

    public List<MonEntiteDTO> getAll() {
        return repo.findAll().stream().map(MonEntiteDTO::from).toList();
    }

    public MonEntiteDTO getById(Long id) {
        return MonEntiteDTO.from(
            repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("MonEntite", id))
        );
    }

    @Transactional
    public MonEntiteDTO create(MonEntite entity) { return MonEntiteDTO.from(repo.save(entity)); }

    @Transactional
    public MonEntiteDTO update(Long id, MonEntite details) {
        MonEntite existing = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("MonEntite", id));
        // copier les champs
        return MonEntiteDTO.from(repo.save(existing));
    }

    @Transactional
    public void delete(Long id) { repo.deleteById(id); }
}
```

### DTO de sortie (Java record — obligatoire)
```java
public record MonEntiteDTO(Long id, String nom, LocalDateTime createdAt) {
    public static MonEntiteDTO from(MonEntite e) {
        return new MonEntiteDTO(e.getId(), e.getNom(), e.getCreatedAt());
    }
}
```

### Controller
```java
@RestController
@RequestMapping("/api/mon-entite")
@Tag(name = "MonEntite", description = "Gestion des mon-entites")
public class MonEntiteController {
    private final MonEntiteService service;

    public MonEntiteController(MonEntiteService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "Lister toutes les entités")
    public ResponseEntity<List<MonEntiteDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MonEntiteDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<MonEntiteDTO> create(@Valid @RequestBody MonEntite entity) {
        return ResponseEntity.ok(service.create(entity));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<MonEntiteDTO> update(@PathVariable Long id, @Valid @RequestBody MonEntite entity) {
        return ResponseEntity.ok(service.update(id, entity));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Règles absolues backend :**
- ❌ Jamais `@Autowired` sur un champ — toujours injection par constructeur
- ❌ Jamais d'entité JPA en réponse directe — toujours un DTO (Java record)
- ✅ `@PreAuthorize` sur chaque endpoint en écriture
- ✅ `ResourceNotFoundException` (404) et `BusinessException` (400) — gérées par `GlobalExceptionHandler`
- ✅ Schéma SQL dans `backend/src/main/resources/schema.sql`

---

## Conventions Frontend (Angular 20 + Ionic 8)

### Structure par feature
```
features/<nom>/
├── <nom>-list/    # Liste (IonList, IonCard)
├── <nom>-form/    # Création/édition (reactive forms + IonInput)
└── <nom>-detail/  # Vue détail (optionnel)
```

### Service HTTP
```typescript
@Injectable({ providedIn: 'root' })
export class MonEntiteService {
  private readonly API = '/api/mon-entite';  // relatif — proxy Angular en dev

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

### Composant liste (Ionic — standalone)
```typescript
@Component({
  selector: 'app-mon-entite-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonList, IonItem, IonLabel, IonButton, IonIcon,
    IonFab, IonFabButton,
    TranslocoModule,
  ],
  providers: [provideTranslocoScope('mon-entite')],
  template: `...`,
})
export class MonEntiteListComponent implements OnInit {
  items = signal<MonEntite[]>([]);

  constructor(private service: MonEntiteService) {}

  ngOnInit() {
    this.service.getAll().subscribe(data => this.items.set(data));
  }
}
```

**Règles absolues frontend :**
- ❌ Jamais Angular Material — uniquement composants Ionic
- ❌ Jamais `NgModule` — uniquement standalone components
- ❌ Jamais de texte hardcodé FR dans les templates — `{{ 'CLE' | transloco }}`
- ✅ Signals (`signal()`) pour l'état local des composants
- ✅ NgRx uniquement pour l'auth — tout le reste en services directs
- ✅ `data-testid` sur tous les éléments interactifs clés

### Route lazy-loadée dans `app.routes.ts`
```typescript
{
  path: 'mon-entite',
  loadComponent: () => import('./features/mon-entite/mon-entite-list/mon-entite-list.component')
    .then(m => m.MonEntiteListComponent),
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: ['ADMIN', 'MANAGER'] }
}
```

### Traductions à créer
```
frontend/src/assets/i18n/
├── fr.json      ← ajouter les clés globales
├── en.json      ← idem en anglais
├── fr/mon-entite.json   ← clés scopées feature
└── en/mon-entite.json
```

---

## Rôles et sécurité

| Rôle | Backend `@PreAuthorize` | Frontend `data: { roles: [...] }` |
|------|------------------------|------------------------------------|
| `ADMIN` | `hasRole('ADMIN')` | `['ADMIN']` |
| `MANAGER` | `hasRole('MANAGER')` | `['MANAGER']` |
| `SERVEUR` | `hasRole('SERVEUR')` | `['SERVEUR']` |
| `BARMAN` | `hasRole('BARMAN')` | `['BARMAN']` |

---

## WebSocket — Notifier après une action métier

Si la feature nécessite des notifications temps réel :

```java
// Dans le service métier — injecter NotificationService
@Autowired  // ← exception acceptée pour NotificationService (évite la circulaire)
private NotificationService notificationService;

// Après la mutation :
messagingTemplate.convertAndSend("/topic/mon-topic", payload);
```

Topics existants : `/topic/commandes`, `/topic/commandes/{id}`, `/topic/tables`, `/topic/stock/alerte`

---

## Tests à écrire (obligatoires dans le même ticket)

### Backend (JUnit 5 + Mockito)
```java
@ExtendWith(MockitoExtension.class)
class MonEntiteServiceTest {
    @Mock MonEntiteRepository repo;
    @InjectMocks MonEntiteService service;

    @Test void getAll_retourneListe() {
        given(repo.findAll()).willReturn(List.of(new MonEntite()));
        assertThat(service.getAll()).hasSize(1);
    }

    @Test void getById_idInexistant_leveException() {
        given(repo.findById(99L)).willReturn(Optional.empty());
        assertThatThrownBy(() -> service.getById(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
```

Localisation : `backend/src/test/java/.../service/MonEntiteServiceTest.java`

### Frontend (Karma + Jasmine)
```typescript
describe('MonEntiteService', () => {
  let service: MonEntiteService;
  let http: HttpTestingController;

  beforeEach(() => TestBed.configureTestingModule({
    imports: [provideHttpClientTesting()],
    providers: [MonEntiteService]
  }));

  it('getAll() appelle GET /api/mon-entite', () => {
    service.getAll().subscribe(data => expect(data.length).toBe(1));
    const req = http.expectOne('/api/mon-entite');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'Test' }]);
  });
});
```

Localisation : `frontend/src/test/features/mon-entite/services/mon-entite.service.spec.ts`

---

## Checklist avant de livrer le code

- [ ] Modèle JPA avec `@PrePersist`/`@PreUpdate`
- [ ] Table dans `schema.sql`
- [ ] Repository extends `JpaRepository`
- [ ] Service avec injection constructeur + `@Transactional`
- [ ] DTO Java record avec `from(entity)`
- [ ] Controller avec `@PreAuthorize` sur les endpoints écriture
- [ ] Composant Angular standalone (Ionic uniquement)
- [ ] Service Angular avec `HttpClient`
- [ ] Route lazy-loadée dans `app.routes.ts`
- [ ] Clés Transloco ajoutées (`fr.json` + `en.json`)
- [ ] `data-testid` sur les éléments interactifs
- [ ] Tests backend : cas nominal + cas erreur + cas limites
- [ ] Tests frontend : même couverture
- [ ] Lien navbar si pertinent
