import { Component, OnInit, OnDestroy, Optional } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { takeUntil, filter, map, startWith } from 'rxjs/operators';
import { selectCurrentUser, selectIsAdmin, selectIsAuthenticated } from '../../store/auth.selectors';
import { NavigationService } from '../../services/navigation.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { SoundService } from '../../services/sound.service';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonPopover, IonList, IonItem, IonLabel, IonBadge,
  PopoverController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { home, settings, personCircle, person, logOut, chevronDown, notificationsOutline, volumeHighOutline, volumeMuteOutline } from 'ionicons/icons';
import { AsyncPipe, NgIf } from '@angular/common';
import * as AuthActions from '../../store/auth.actions';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonPopover, IonList, IonItem, IonLabel, IonBadge,
    NgIf, AsyncPipe,
  ],
})
export class NavbarComponent implements OnInit, OnDestroy {
  isAuthenticated$: Observable<boolean>;
  isAdmin$: Observable<boolean>;
  currentUser$: Observable<any>;
  shouldShowNavbar$: Observable<boolean>;
  nonLues = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    public readonly navigationService: NavigationService,
    private readonly notifService: NotificationService,
    public readonly soundService: SoundService,
    private readonly popoverCtrl: PopoverController,
    @Optional() private readonly router?: Router,
  ) {
    this.isAuthenticated$ = this.store.select(selectIsAuthenticated);
    this.isAdmin$ = this.store.select(selectIsAdmin);
    this.currentUser$ = this.store.select(selectCurrentUser);
    addIcons({ home, settings, personCircle, person, logOut, chevronDown, notificationsOutline, volumeHighOutline, volumeMuteOutline });

    const initialUrl = (this.router?.url && this.router.url.length > 0) ? this.router.url : '/';
    const currentUrl$ = this.router ? this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects || event.url),
      startWith(initialUrl)
    ) : of('/');

    this.shouldShowNavbar$ = combineLatest([this.isAuthenticated$, currentUrl$]).pipe(
      map(([auth, url]) => {
        const isAuthOrSetupRoute = url.includes('/auth/') || url.includes('/setup');
        return Boolean(auth) && !isAuthOrSetupRoute;
      })
    );
  }

  ngOnInit(): void {
    this.notifService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.nonLues = this.notifService.getNonLues();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async ouvrirNotifications(event: Event) {
    const popover = await this.popoverCtrl.create({
      component: NotificationPanelComponent,
      event,
      translucent: true,
      size: 'auto',
    });
    await popover.present();
    await popover.onDidDismiss();
    this.nonLues = this.notifService.getNonLues();
  }

  toggleSound(): void {
    this.soundService.toggleSound();
  }

  onLogout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
