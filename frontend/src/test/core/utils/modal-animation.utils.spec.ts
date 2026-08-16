import { fastModalEnterAnimation, fastModalLeaveAnimation } from '../../../app/core/utils/modal-animation.utils';

describe('ModalAnimationUtils', () => {
  let baseEl: HTMLElement;

  beforeEach(() => {
    baseEl = document.createElement('div');
    const backdrop = document.createElement('ion-backdrop');
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-wrapper';
    baseEl.appendChild(backdrop);
    baseEl.appendChild(wrapper);
  });

  it('should create fast modal enter animation', () => {
    const animation = fastModalEnterAnimation(baseEl);
    expect(animation).toBeTruthy();
    expect(animation.getDuration()).toBe(160);
    expect(animation.getEasing()).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
  });

  it('should create fast modal leave animation with reverse direction', () => {
    const animation = fastModalLeaveAnimation(baseEl);
    expect(animation).toBeTruthy();
    expect(animation.getDirection()).toBe('reverse');
  });
});
