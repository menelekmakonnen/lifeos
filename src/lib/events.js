// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Application Event Bus
// Lightweight pub/sub for decoupled communication between
// modules. Pages, components, and services can emit and listen
// for events without importing each other directly.
//
// Usage:
//   import { on, emit } from '../lib/events.js';
//   const unsub = on('expense:added', (data) => { ... });
//   emit('expense:added', { id: '123', amount: 50 });
//   unsub(); // clean up when done
//
// Convention for event names: 'domain:action'
//   e.g. 'expense:added', 'task:completed', 'nav:changed',
//        'currency:switched', 'sync:started', 'sync:done'
// ═══════════════════════════════════════════════════════════════

// ── Internal Listener Registry ──
// Map of event name → Set of handler functions
const _listeners = new Map();

// ═══════════════════════════════════════════════════════════════
// Core API
// ═══════════════════════════════════════════════════════════════

/**
 * Subscribe to an event. The handler will be called each time
 * the event is emitted, receiving the data payload.
 *
 * @param {string} event — event name (e.g. 'expense:added')
 * @param {Function} handler — callback receiving (data)
 * @returns {Function} — unsubscribe function for easy cleanup
 *
 * @example
 *   const unsub = on('task:completed', (task) => {
 *     console.log(`Completed: ${task.title}`);
 *   });
 *   // Later:
 *   unsub();
 */
export function on(event, handler) {
  if (typeof handler !== 'function') {
    console.warn(`[events] on('${event}'): handler is not a function`);
    return () => {};
  }

  if (!_listeners.has(event)) {
    _listeners.set(event, new Set());
  }
  _listeners.get(event).add(handler);

  // Return an unsubscribe function for convenience
  return () => off(event, handler);
}

/**
 * Unsubscribe a specific handler from an event.
 *
 * @param {string} event — event name
 * @param {Function} handler — the exact function reference to remove
 */
export function off(event, handler) {
  const handlers = _listeners.get(event);
  if (handlers) {
    handlers.delete(handler);
    // Clean up empty Sets to prevent memory leaks
    if (handlers.size === 0) {
      _listeners.delete(event);
    }
  }
}

/**
 * Emit an event, calling all subscribed handlers with the data.
 * Handlers are called synchronously in registration order.
 * Errors in individual handlers are caught and logged so one
 * broken handler doesn't prevent others from executing.
 *
 * @param {string} event — event name
 * @param {*} [data] — optional payload passed to each handler
 */
export function emit(event, data) {
  const handlers = _listeners.get(event);
  if (!handlers || handlers.size === 0) return;

  // Iterate over a snapshot so handlers can safely unsub mid-emit
  for (const handler of [...handlers]) {
    try {
      handler(data);
    } catch (err) {
      console.error(`[events] Error in handler for '${event}':`, err);
    }
  }
}

/**
 * Subscribe to an event for a single emission only. The handler
 * is automatically removed after it fires once.
 *
 * @param {string} event — event name
 * @param {Function} handler — one-shot callback receiving (data)
 * @returns {Function} — unsubscribe function (in case you want
 *   to cancel before the event fires)
 *
 * @example
 *   once('sync:done', (result) => {
 *     toast('Sync complete!');
 *   });
 */
export function once(event, handler) {
  const wrapper = (data) => {
    off(event, wrapper);
    handler(data);
  };
  return on(event, wrapper);
}

/**
 * Remove all listeners for a specific event.
 * Useful when tearing down a page or feature module.
 *
 * @param {string} event — event name to clear
 */
export function clear(event) {
  _listeners.delete(event);
}

/**
 * Remove ALL listeners for ALL events. Called during page
 * navigation to ensure no stale handlers from the previous
 * page leak into the new page. Modules that need persistent
 * listeners (e.g. sync status) should re-register after
 * navigation in their init function.
 */
export function clearAll() {
  _listeners.clear();
}
