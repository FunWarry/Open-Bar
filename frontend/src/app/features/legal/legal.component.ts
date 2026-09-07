import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonBadge,
  IonCard,
  IonCardContent,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  shieldCheckmarkOutline,
  receiptOutline,
  briefcaseOutline,
  closeOutline,
  arrowBackOutline,
  lockClosedOutline,
  serverOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  mailOutline,
  logoGithub,
  hardwareChipOutline,
} from 'ionicons/icons';

/**
 * Tab identifiers supported by the Legal and Licensing viewer.
 */
export type LegalTab = 'terms' | 'license' | 'compliance' | 'commercial';

/**
 * Standalone component and modal viewer for OpenBar Terms of Service (CGU),
 * Source-Available Non-Commercial License v1.0, Fiscal/GDPR Compliance, and Commercial Licensing.
 */
@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonBadge,
    IonCard,
    IonCardContent,
    TranslocoPipe,
  ],
  templateUrl: './legal.component.html',
  styleUrls: ['./legal.component.scss'],
})
export class LegalComponent implements OnInit {
  @Input() initialTab: LegalTab = 'terms';
  @Input() isModal = false;

  activeTab: LegalTab = 'terms';

  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly location = inject(Location);
  private readonly modalCtrl = inject(ModalController, { optional: true });

  constructor() {
    addIcons({
      documentTextOutline,
      shieldCheckmarkOutline,
      receiptOutline,
      briefcaseOutline,
      closeOutline,
      arrowBackOutline,
      lockClosedOutline,
      serverOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      mailOutline,
      logoGithub,
      hardwareChipOutline,
    });
  }

  ngOnInit(): void {
    if (this.initialTab) {
      this.activeTab = this.initialTab;
    }

    if (this.route?.snapshot?.queryParams?.['tab']) {
      const queryTab = this.route.snapshot.queryParams['tab'] as LegalTab;
      if (['terms', 'license', 'compliance', 'commercial'].includes(queryTab)) {
        this.activeTab = queryTab;
      }
    }
  }

  /**
   * Switches the currently active legal tab.
   *
   * @param tab Selected tab identifier
   */
  selectTab(tab: LegalTab): void {
    this.activeTab = tab;
  }

  /**
   * Closes the view: dismisses the modal if presented inside one, otherwise navigates back in browser history.
   */
  async close(): Promise<void> {
    const topModal = this.modalCtrl ? await this.modalCtrl.getTop() : null;
    if (this.modalCtrl && (this.isModal || topModal)) {
      try {
        await this.modalCtrl.dismiss(null, 'close');
      } catch {
        this.location.back();
      }
    } else {
      this.location.back();
    }
  }
}
