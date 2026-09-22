import { Component, Input, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  closeOutline,
  saveOutline,
  personOutline,
  mailOutline,
  callOutline,
  locationOutline
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { Supplier, SupplierCreateRequest } from '../../../core/models/supplier.model';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { ToggleSwitchComponent } from '../../../core/components/ui/toggle-switch/toggle-switch.component';

/**
 * Modal form for creating and editing supplier vendors.
 */
@Component({
  selector: 'app-supplier-form-modal',
  templateUrl: './supplier-form-modal.component.html',
  styleUrls: ['./supplier-form-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonIcon,
    TranslocoPipe,
    InputFieldComponent,
    ToggleSwitchComponent
  ]
})
export class SupplierFormModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly modalCtrl = inject(ModalController);

  @Input() supplier?: Supplier;

  form!: FormGroup;

  constructor() {
    addIcons({
      businessOutline,
      closeOutline,
      saveOutline,
      personOutline,
      mailOutline,
      callOutline,
      locationOutline
    });
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nom: [this.supplier?.nom || '', [Validators.required, Validators.maxLength(255)]],
      contactNom: [this.supplier?.contactNom || '', [Validators.maxLength(255)]],
      email: [this.supplier?.email || '', [Validators.email, Validators.maxLength(255)]],
      telephone: [this.supplier?.telephone || '', [Validators.maxLength(50)]],
      adresse: [this.supplier?.adresse || '', [Validators.maxLength(500)]],
      codePostal: [this.supplier?.codePostal || '', [Validators.maxLength(20)]],
      ville: [this.supplier?.ville || '', [Validators.maxLength(100)]],
      siret: [this.supplier?.siret || '', [Validators.maxLength(50)]],
      notes: [this.supplier?.notes || '', [Validators.maxLength(2000)]],
      actif: [this.supplier ? this.supplier.actif : true]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload: SupplierCreateRequest = this.form.value;
    this.modalCtrl.dismiss({ supplier: payload, confirmed: true });
  }

  onCancel(): void {
    this.modalCtrl.dismiss({ confirmed: false });
  }
}
