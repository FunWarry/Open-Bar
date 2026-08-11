import { Animation, createAnimation } from '@ionic/angular/standalone';

/**
 * Ultra-fast, hardware-accelerated 60 FPS modal entrance animation.
 * Eliminates browser lag by using translateZ(0) acceleration and 160ms timing.
 */
export const fastModalEnterAnimation = (baseEl: HTMLElement): Animation => {
  const root = baseEl.shadowRoot || baseEl;
  const backdropEl = root.querySelector('ion-backdrop');
  const wrapperEl = root.querySelector('.modal-wrapper') || root.querySelector('[part="content"]');

  const backdropAnimation = createAnimation()
    .addElement(backdropEl!)
    .fromTo('opacity', '0.01', '0.7');

  const wrapperAnimation = createAnimation()
    .addElement(wrapperEl!)
    .beforeStyles({
      'will-change': 'transform, opacity',
      'transform-origin': 'center center',
      'transform': 'translateZ(0)',
    })
    .afterStyles({
      'will-change': 'auto',
    })
    .fromTo('opacity', '0.01', '1')
    .fromTo('transform', 'translateY(12px) scale(0.98) translateZ(0)', 'translateY(0px) scale(1) translateZ(0)');

  return createAnimation()
    .addElement(baseEl)
    .easing('cubic-bezier(0.16, 1, 0.3, 1)')
    .duration(160)
    .addAnimation([backdropAnimation, wrapperAnimation]);
};

/**
 * Ultra-fast hardware-accelerated modal exit animation.
 */
export const fastModalLeaveAnimation = (baseEl: HTMLElement): Animation => {
  return fastModalEnterAnimation(baseEl).direction('reverse');
};
