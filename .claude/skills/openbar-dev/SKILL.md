# Skill : openbar-dev

Génère du code pour le projet OpenBar en respectant les conventions existantes.

## Quand utiliser ce skill

- "Ajoute une feature X au projet"
- "Crée le CRUD pour [entité]"
- "Génère le composant Angular pour [feature]"
- "Ajoute l'endpoint [action]"
- "Implémente [feature] côté backend/frontend"

---

## Instructions

Avant de générer du code, vérifie toujours les points suivants :

### 1. Identifier le périmètre
- Backend seul, frontend seul, ou full-stack ?
- Nouvelle entité ou extension d'une entité existante ?

### 2. Conventions backend (Spring Boot)

**Modèle JPA :**
```java
@Data
@Entity
@Table(name = "ma_table")
public class MonEntite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ... champs métier

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

**Repository :**
```java
public interface MonEntiteRepository extends JpaRepository<MonEntite, Long> {
    // méthodes dérivées Spring Data si besoin
}
```

**Service :**
```java
@Service
@Transactional
public class MonEntiteService {
    private final MonEntiteRepository repo;

    // INJECTION PAR CONSTRUCTEUR — jamais @Autowired sur champ
    public MonEntiteService(MonEntiteRepository repo) {
        this.repo = repo;
    }

    public List<MonEntite> getAll() { return repo.findAll(); }

    public MonEntite getById(Long id) {
        return repo.findById(id)
            .orElseThrow(() -> new RuntimeException("MonEntite non trouvée: " + id));
    }

    @Transactional
    public MonEntite create(MonEntite entity) { return repo.save(entity); }

    @Transactional
    public MonEntite update(Long id, MonEntite details) {
        MonEntite existing = getById(id);
        // copier les champs
        return repo.save(existing);
    }

    @Transactional
    public void delete(Long id) { repo.deleteById(id); }
}
```

**Controller :**
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

**Schema SQL :** ajouter la table dans `backend/src/main/resources/schema.sql`

---

### 3. Conventions frontend (Angular 19)

**Structure dans `features/<nom>/` :**
```
<nom>-list/   — liste avec Material Table ou cards
<nom>-form/   — création/édition (reactive forms)
<nom>-detail/ — vue détail (optionnel)
```

**Service HTTP :**
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

  create(entity: MonEntite): Observable<MonEntite> {
    return this.http.post<MonEntite>(this.API, entity);
  }

  update(id: number, entity: MonEntite): Observable<MonEntite> {
    return this.http.put<MonEntite>(`${this.API}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
```

**Composant list :**
- Standalone component (`standalone: true`)
- Imports : `CommonModule`, `RouterModule`, `MatTableModule`, `MatButtonModule`, etc.
- Pas de NgRx sauf pour l'auth — état local avec `signal` ou propriétés de composant

**Route dans `app.routes.ts` :**
```typescript
{
  path: 'mon-entite',
  loadComponent: () => import('./features/mon-entite/mon-entite-list/mon-entite-list.component')
    .then(m => m.MonEntiteListComponent),
  canActivate: [AuthGuard]
}
```

---

### 4. Rôles et sécurité

Rôles disponibles : `ADMIN`, `SERVEUR`, `BARMEN`

Pour restreindre un endpoint backend, vérifier `SecurityConfig` pour les règles existantes ou ajouter dans le service via le `UserPrincipal`.

Pour restreindre une route frontend :
```typescript
canActivate: [AuthGuard, RoleGuard],
data: { roles: ['ADMIN'] }
```

---

### 5. WebSocket — notifier après une action

Si la feature nécessite des notifications temps réel, injecter `NotificationService` dans le service métier et appeler la méthode appropriée ou en créer une nouvelle :
```java
messagingTemplate.convertAndSend("/topic/<nouveau-topic>", payload);
```

---

### 6. Checklist avant de livrer le code

- [ ] Modèle JPA avec `@PrePersist`/`@PreUpdate`
- [ ] Table ajoutée dans `schema.sql`
- [ ] Repository étend `JpaRepository`
- [ ] Service avec injection par constructeur + `@Transactional`
- [ ] Controller avec `@RestController` + `@RequestMapping`
- [ ] Composant Angular standalone
- [ ] Service Angular avec `HttpClient`
- [ ] Route lazy-loadée dans `app.routes.ts`
- [ ] Lien dans la navbar si pertinent
