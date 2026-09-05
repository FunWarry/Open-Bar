/**
 * Utility functions for Ionic refresher component operations.
 */

/**
 * Safely completes an Ionic refresher event.
 * Prevents TypeError when completing a refresher on a component that has been unmounted or detached from DOM.
 *
 * @param event The Ionic refresher event object (CustomEvent or object containing target.complete)
 */
export function safeCompleteRefresher(event: any): void {
  const target = event?.target;
  if (target?.complete && (target.isConnected ?? true)) {
    try {
      target.complete();
    } catch {
      // Ignore errors if element was detached mid-animation
    }
  }
}
