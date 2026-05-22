// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Targeted DOM Rendering & Event Delegation
// Replaces full-innerHTML rebuilds with a mount/patch pattern
// that tracks render functions per container and re-renders
// only what changed. Event delegation via data-action attributes.
// ═══════════════════════════════════════════════════════════════

// ── Internal Registry ──
// Maps container IDs to their render functions for later patching
const _mounts = new Map();

// ── Core Layout Container IDs ──
// The four structural containers that patchAll() re-renders
const LAYOUT_CONTAINERS = ['sidebar', 'topbar', 'mobile-nav', 'content'];

// ═══════════════════════════════════════════════════════════════
// HTML Escaping
// ═══════════════════════════════════════════════════════════════

/**
 * Escape HTML entities in a string to prevent XSS.
 * Handles the five critical characters: & < > " '
 * @param {string} str — raw string to escape
 * @returns {string} — safe HTML string
 */
export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ═══════════════════════════════════════════════════════════════
// Tagged Template Literal — Safe HTML Builder
// ═══════════════════════════════════════════════════════════════

/**
 * Tagged template literal that auto-escapes all interpolated values.
 * Use html`<div>${userInput}</div>` for safe HTML generation.
 *
 * To insert raw (pre-sanitized) HTML, wrap the value:
 *   html`<div>${{ __html: '<b>trusted content</b>' }}</div>`
 *
 * Arrays are joined automatically (useful for .map() results):
 *   html`<ul>${items.map(i => html`<li>${i.name}</li>`)}</ul>`
 *
 * @param {TemplateStringsArray} strings — static template parts
 * @param {...*} values — interpolated expressions
 * @returns {string} — assembled HTML string
 */
export function html(strings, ...values) {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const val = values[i];
      if (val && typeof val === 'object' && val.__html !== undefined) {
        // Raw HTML passthrough — caller takes responsibility for safety
        result += val.__html;
      } else if (Array.isArray(val)) {
        // Arrays are joined without separator (common for .map() chains)
        result += val.join('');
      } else if (val == null || val === false) {
        // Falsy values render as empty string (convenient for conditionals)
        result += '';
      } else {
        // Everything else gets HTML-escaped
        result += esc(val);
      }
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Mount / Patch System
// ═══════════════════════════════════════════════════════════════

/**
 * Render HTML into a container and register the render function
 * for later patching. If the container doesn't exist in the DOM,
 * logs a warning and returns null.
 *
 * @param {string} containerId — DOM element id (e.g. 'content')
 * @param {Function} renderFn — function returning an HTML string
 * @returns {HTMLElement|null} — the container element, or null
 */
export function mount(containerId, renderFn) {
  const el = document.getElementById(containerId);
  if (!el) {
    console.warn(`[renderer] mount: container #${containerId} not found`);
    return null;
  }

  // Store the render function for future patch() calls
  _mounts.set(containerId, renderFn);

  // Perform the initial render
  el.innerHTML = renderFn();
  return el;
}

/**
 * Re-render a previously mounted container using its stored
 * render function. Preserves the element's scroll position so
 * the user doesn't lose their place during updates.
 *
 * @param {string} containerId — DOM element id
 * @returns {boolean} — true if patched, false if not found/mounted
 */
export function patch(containerId) {
  const renderFn = _mounts.get(containerId);
  if (!renderFn) {
    console.warn(`[renderer] patch: no render function registered for #${containerId}`);
    return false;
  }

  const el = document.getElementById(containerId);
  if (!el) {
    console.warn(`[renderer] patch: container #${containerId} not found in DOM`);
    return false;
  }

  // Preserve scroll position before re-render
  const scrollTop = el.scrollTop;
  const scrollLeft = el.scrollLeft;

  // Re-render content
  el.innerHTML = renderFn();

  // Restore scroll position
  el.scrollTop = scrollTop;
  el.scrollLeft = scrollLeft;

  return true;
}

/**
 * Re-render all four core layout containers: sidebar, topbar,
 * mobile-nav, and content. Only patches containers that have
 * been previously mounted. Useful after state changes that
 * affect the entire UI (e.g. navigation, theme switch).
 */
export function patchAll() {
  for (const id of LAYOUT_CONTAINERS) {
    if (_mounts.has(id)) {
      patch(id);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Event Delegation
// ═══════════════════════════════════════════════════════════════

/**
 * Set up event delegation on a container element. Listens for
 * the specified event type, walks up from the event target to
 * find the nearest element with the given action attribute,
 * then calls the matching handler if one exists.
 *
 * This avoids attaching listeners to individual elements —
 * critical since innerHTML rebuilds destroy old listeners.
 *
 * @param {HTMLElement} container — the parent element to listen on
 * @param {string} eventType — e.g. 'click', 'change', 'input'
 * @param {string} actionAttr — attribute name, e.g. 'data-action'
 * @param {Object<string, Function>} handlers — map of action names to handlers
 *   Each handler receives (event, matchedElement)
 * @returns {Function} — cleanup function that removes the listener
 *
 * @example
 *   delegate(document.getElementById('content'), 'click', 'data-action', {
 *     deleteExpense: (e, el) => { ... },
 *     editTask: (e, el) => { ... },
 *   });
 */
export function delegate(container, eventType, actionAttr, handlers) {
  if (!container) {
    console.warn('[renderer] delegate: container is null/undefined');
    return () => {};
  }

  const listener = (event) => {
    // Walk up the DOM tree from the event target to find an element
    // with the action attribute, stopping at the container boundary
    const target = event.target.closest(`[${actionAttr}]`);

    // Ignore clicks outside any action-bearing element, or outside container
    if (!target || !container.contains(target)) return;

    const action = target.getAttribute(actionAttr);
    const handler = handlers[action];

    if (handler) {
      handler(event, target);
    }
  };

  container.addEventListener(eventType, listener);

  // Return a cleanup function for teardown
  return () => container.removeEventListener(eventType, listener);
}

/**
 * Set up delegation for multiple event types at once.
 * Convenience wrapper around delegate() for pages that need
 * click, change, and input handlers all at once.
 *
 * @param {HTMLElement} container — the parent element
 * @param {Object} handlerMap — nested map:
 *   { 'click': { actionName: handler }, 'change': { ... }, 'input': { ... } }
 * @param {string} [actionAttr='data-action'] — attribute to look for
 * @returns {Function} — cleanup function that removes all listeners
 *
 * @example
 *   const cleanup = delegateAll(contentEl, {
 *     click: {
 *       deleteExpense: (e, el) => { ... },
 *       toggleTask: (e, el) => { ... },
 *     },
 *     change: {
 *       selectCurrency: (e, el) => { ... },
 *     },
 *     input: {
 *       searchFilter: (e, el) => { ... },
 *     },
 *   });
 *
 *   // Later, to tear down:
 *   cleanup();
 */
export function delegateAll(container, handlerMap, actionAttr = 'data-action') {
  const cleanups = [];

  for (const [eventType, handlers] of Object.entries(handlerMap)) {
    const cleanup = delegate(container, eventType, actionAttr, handlers);
    cleanups.push(cleanup);
  }

  // Return a single function that removes all listeners
  return () => cleanups.forEach(fn => fn());
}
