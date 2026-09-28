import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { sparklesOutline, refreshOutline } from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { RouletteWheelSector } from '../../../models/roulette.model';
import { RouletteAudioService } from '../../../services/roulette-audio.service';

const DEFAULT_STARTER_SECTORS: RouletteWheelSector[] = [
  { id: 1, label: 'Mojito', prizeType: 'COCKTAIL', colorHex: '#10b981', iconName: 'wine-outline', probabilityWeight: 2, active: true, displayOrder: 0 },
  { id: 2, label: 'Création Barman', prizeType: 'BARTENDER_SPECIAL', colorHex: '#f59e0b', iconName: 'sparkles-outline', probabilityWeight: 3, active: true, displayOrder: 1 },
  { id: 3, label: 'Margarita', prizeType: 'COCKTAIL', colorHex: '#ec4899', iconName: 'wine-outline', probabilityWeight: 2, active: true, displayOrder: 2 },
  { id: 4, label: 'Tournée Shooters', prizeType: 'SHOOTER', colorHex: '#ef4444', iconName: 'flame-outline', probabilityWeight: 1, active: true, displayOrder: 3 },
  { id: 5, label: 'Piña Colada', prizeType: 'COCKTAIL', colorHex: '#8b5cf6', iconName: 'wine-outline', probabilityWeight: 2, active: true, displayOrder: 4 },
  { id: 6, label: 'Shooter au Choix', prizeType: 'CUSTOM_REWARD', colorHex: '#06b6d4', iconName: 'gift-outline', probabilityWeight: 1, active: true, displayOrder: 5 },
  { id: 7, label: 'Virgin Mojito', prizeType: 'COCKTAIL', colorHex: '#3b82f6', iconName: 'leaf-outline', probabilityWeight: 2, active: true, displayOrder: 6 },
  { id: 8, label: 'Moscow Mule', prizeType: 'COCKTAIL', colorHex: '#6366f1', iconName: 'beer-outline', probabilityWeight: 2, active: true, displayOrder: 7 }
];

/**
 * High-performance interactive Cocktail Roulette Wheel component rendered via HTML5 Canvas.
 * Supports luxury casino styling, smooth decelerating physics, sector tick sounds, haptics,
 * and ambient idle rotations on display screens.
 */
@Component({
  selector: 'app-roulette-wheel',
  standalone: true,
  imports: [CommonModule, IonIcon, TranslocoModule],
  templateUrl: './roulette-wheel.component.html',
  styleUrl: './roulette-wheel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouletteWheelComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('wheelCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  /** List of wheel slices / sectors to display. */
  @Input() sectors: RouletteWheelSector[] = [];

  /** Wheel diameter in pixels (defaults to 380). */
  @Input() size = 380;

  /** Whether the wheel is currently spinning. */
  @Input() isSpinning = false;

  /** Read-only mode hides the spin button (e.g. for display-only screens). */
  @Input() readOnly = false;

  /** Emitted when user clicks the manual spin button. */
  @Output() spinRequested = new EventEmitter<void>();

  /** Emitted when spinning animation finishes and lands on winning index. */
  @Output() spinComplete = new EventEmitter<{ sector: RouletteWheelSector; index: number }>();

  private readonly audioService = inject(RouletteAudioService);
  private readonly cdr = inject(ChangeDetectorRef);

  private currentAngle = 0; // In radians
  private animationFrameId: number | null = null;
  private idleAnimationId: number | null = null;
  private lastTickIndex = -1;

  private readonly defaultColors = [
    '#10b981', '#f59e0b', '#ec4899', '#ef4444',
    '#8b5cf6', '#06b6d4', '#3b82f6', '#6366f1'
  ];

  constructor() {
    addIcons({
      sparklesOutline,
      refreshOutline
    });
  }

  ngAfterViewInit(): void {
    this.drawWheel();
    this.startIdleAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['sectors'] || changes['size']) && this.canvasRef) {
      this.drawWheel();
    }
  }

  private adjustBrightness(hex: string, percent: number): string {
    const num = Number.parseInt(hex.replace('#', ''), 16);
    if (Number.isNaN(num)) return hex;
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.idleAnimationId !== null) {
      cancelAnimationFrame(this.idleAnimationId);
    }
  }

  private startIdleAnimation(): void {
    if (this.isSpinning) return;
    const idleStep = () => {
      if (!this.isSpinning) {
        this.currentAngle += 0.0018; // Very subtle ambient drift
        this.drawWheel();
      }
      this.idleAnimationId = requestAnimationFrame(idleStep);
    };
    this.idleAnimationId = requestAnimationFrame(idleStep);
  }

  /**
   * Triggers a spinning animation landing on the specified winning sector index.
   *
   * @param targetIndex Index of the target winning sector (0 to N-1)
   * @param durationMs  Animation duration in milliseconds (default 5000)
   */
  spinTo(targetIndex: number, durationMs = 5000): void {
    const activeSectors = this.getActiveSectors();
    if (activeSectors.length === 0) return;

    if (this.idleAnimationId !== null) {
      cancelAnimationFrame(this.idleAnimationId);
      this.idleAnimationId = null;
    }

    this.isSpinning = true;
    this.cdr.markForCheck();

    const n = activeSectors.length;
    const sliceAngle = (2 * Math.PI) / n;

    // Needle pointer is at the very top (3 * Math.PI / 2)
    // The target sector center must align with the top pointer when stopped
    const targetSliceCenter = (targetIndex + 0.5) * sliceAngle;
    const baseTargetAngle = (3 * Math.PI / 2) - targetSliceCenter;

    // Add extra full rotations (e.g. 6 full turns)
    const extraRotations = 6 * (2 * Math.PI);
    const startAngle = this.currentAngle;
    const totalRotation = extraRotations + (baseTargetAngle - (startAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const finalAngle = startAngle + totalRotation;

    const startTime = performance.now();
    this.lastTickIndex = -1;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Deceleration easing (ease-out cubic / quintic hybrid)
      const easeOut = 1 - Math.pow(1 - progress, 3.5);
      this.currentAngle = startAngle + totalRotation * easeOut;

      // Track tick clicks as sector boundaries pass the top pointer
      const normalizedAngle = (this.currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const pointerAngle = (3 * Math.PI / 2 - normalizedAngle + 2 * Math.PI) % (2 * Math.PI);
      const currentSectorIndex = Math.floor(pointerAngle / sliceAngle) % n;

      if (currentSectorIndex !== this.lastTickIndex) {
        this.lastTickIndex = currentSectorIndex;
        this.audioService.playTick(progress);
      }

      this.drawWheel();

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.currentAngle = finalAngle;
        this.drawWheel();
        this.isSpinning = false;
        this.cdr.markForCheck();
        this.spinComplete.emit({
          sector: activeSectors[targetIndex % activeSectors.length],
          index: targetIndex
        });
        // Resume gentle idle drift after a delay
        setTimeout(() => this.startIdleAnimation(), 3000);
      }
    };

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private getActiveSectors(): RouletteWheelSector[] {
    if (this.sectors && this.sectors.length >= 2) {
      return this.sectors;
    }
    return DEFAULT_STARTER_SECTORS;
  }

  /**
   * Draws the wheel canvas slices, casino golden bevel, LED bulbs, and center hub.
   */
  drawWheel(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = this.size * dpr;
    canvas.height = this.size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const radius = this.size / 2 - 20;

    ctx.clearRect(0, 0, this.size, this.size);

    const activeSectors = this.getActiveSectors();
    const n = activeSectors.length;
    const sliceAngle = (2 * Math.PI) / n;

    // 1. Draw Outer Golden Bevel & Casino Arcade Bulbs
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 12, 0, 2 * Math.PI);
    const rimGrad = ctx.createLinearGradient(0, 0, this.size, this.size);
    rimGrad.addColorStop(0, '#fef08a');
    rimGrad.addColorStop(0.3, '#d97706');
    rimGrad.addColorStop(0.7, '#78350f');
    rimGrad.addColorStop(1, '#fef08a');
    ctx.lineWidth = 14;
    ctx.strokeStyle = rimGrad;
    ctx.stroke();

    // Inner gold rim
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    // Light bulbs along outer rim
    const numBulbs = Math.max(n * 3, 24);
    for (let b = 0; b < numBulbs; b++) {
      const bAngle = (b * 2 * Math.PI) / numBulbs;
      const bx = centerX + (radius + 12) * Math.cos(bAngle);
      const by = centerY + (radius + 12) * Math.sin(bAngle);
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = b % 2 === 0 ? '#ffffff' : '#fde047';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fill();
    }
    ctx.restore();

    // 2. Draw Wheel Slices
    for (let i = 0; i < n; i++) {
      const sector = activeSectors[i];
      const start = this.currentAngle + i * sliceAngle;
      const end = start + sliceAngle;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, start, end);
      ctx.closePath();

      // Sector slice fill color with slight radial sheen
      const baseColor = sector?.colorHex || this.defaultColors[i % this.defaultColors.length];
      const sliceGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
      sliceGrad.addColorStop(0, baseColor);
      sliceGrad.addColorStop(1, this.adjustBrightness(baseColor, -25));
      ctx.fillStyle = sliceGrad;
      ctx.fill();

      // Divider line
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

      // Text label drawing inside slice
      ctx.save();
      ctx.translate(centerX, centerY);

      const midAngle = start + sliceAngle / 2;
      ctx.rotate(midAngle);

      const label = sector?.label || `Cocktail ${i + 1}`;
      const emoji = this.resolveSectorEmoji(sector);
      const fullText = `${emoji} ${label}`;

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(12, Math.min(16, Math.floor(this.size / 25)))}px "Outfit", "Inter", sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.textBaseline = 'middle';

      // Check if text is in left hemisphere (between 90 deg and 270 deg)
      const normAngle = ((midAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const isLeft = normAngle > Math.PI / 2 && normAngle < (3 * Math.PI) / 2;

      if (isLeft) {
        ctx.rotate(Math.PI);
        ctx.textAlign = 'left';
        ctx.fillText(fullText, -(radius - 22), 0);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(fullText, radius - 22, 0);
      }

      ctx.restore();
      ctx.restore();
    }

    // 3. Center Multi-Layer Metallic Casino Hub
    ctx.save();
    // Outer hub ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.24, 0, 2 * Math.PI);
    const hubOuter = ctx.createLinearGradient(centerX - 20, centerY - 20, centerX + 20, centerY + 20);
    hubOuter.addColorStop(0, '#fef08a');
    hubOuter.addColorStop(0.5, '#d97706');
    hubOuter.addColorStop(1, '#451a03');
    ctx.fillStyle = hubOuter;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fef3c7';
    ctx.stroke();

    // Inner dark plate
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.17, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Center 3D Dice Icon
    ctx.font = `bold ${Math.floor(radius * 0.13)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎲', centerX, centerY + 1);
    ctx.restore();
  }

  private resolveSectorEmoji(sector?: RouletteWheelSector): string {
    if (!sector) return '🍸';
    if (sector.prizeType === 'BARTENDER_SPECIAL') return '✨';
    if (sector.prizeType === 'SHOOTER') return '🔥';
    if (sector.prizeType === 'CUSTOM_REWARD') return '🎁';
    const nom = (sector.label || '').toLowerCase();
    if (nom.includes('mojito') || nom.includes('virgin')) return '🍃';
    if (nom.includes('margarita')) return '🍸';
    if (nom.includes('piña') || nom.includes('colada')) return '🥥';
    if (nom.includes('mule') || nom.includes('beer')) return '🍺';
    return '🍹';
  }

  /**
   * User manual spin button handler.
   */
  onSpinClick(): void {
    if (this.isSpinning || this.readOnly) return;
    this.spinRequested.emit();
  }
}
