import { safeCompleteRefresher } from '../../../app/core/utils/refresher-utils';

describe('refresher-utils', () => {
  describe('safeCompleteRefresher', () => {
    it('should call target.complete() when event is valid and target is connected or has undefined isConnected', () => {
      const completeSpy = jasmine.createSpy('complete');
      const mockEvent = { target: { complete: completeSpy } };

      safeCompleteRefresher(mockEvent);

      expect(completeSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT call target.complete() when target.isConnected is false', () => {
      const completeSpy = jasmine.createSpy('complete');
      const mockEvent = { target: { complete: completeSpy, isConnected: false } };

      safeCompleteRefresher(mockEvent);

      expect(completeSpy).not.toHaveBeenCalled();
    });

    it('should call target.complete() when target.isConnected is true', () => {
      const completeSpy = jasmine.createSpy('complete');
      const mockEvent = { target: { complete: completeSpy, isConnected: true } };

      safeCompleteRefresher(mockEvent);

      expect(completeSpy).toHaveBeenCalledTimes(1);
    });

    it('should gracefully handle null, undefined, or missing event / target', () => {
      expect(() => safeCompleteRefresher(null)).not.toThrow();
      expect(() => safeCompleteRefresher(undefined)).not.toThrow();
      expect(() => safeCompleteRefresher({})).not.toThrow();
      expect(() => safeCompleteRefresher({ target: {} })).not.toThrow();
    });

    it('should catch and suppress any errors thrown by target.complete()', () => {
      const throwingEvent = {
        target: {
          isConnected: true,
          complete: () => {
            throw new TypeError("Cannot read properties of undefined (reading 'enable')");
          }
        }
      };

      expect(() => safeCompleteRefresher(throwingEvent)).not.toThrow();
    });
  });
});
