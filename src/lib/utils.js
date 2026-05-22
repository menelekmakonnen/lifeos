// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Shared Utility Functions
// Currency formatting, date manipulation, exchange rates,
// and common helpers used across all modules and pages.
// ═══════════════════════════════════════════════════════════════

// ── Store Import ──
// We import `prefs` as an object reference from store.js.
// Since `prefs` is a mutable object (reassigned by initData()),
// we import the *module binding* — ES module live bindings ensure
// we always see the latest value even after initData() reassigns it.
// This means any code that accesses prefs.name, prefs.gbpToUsd, etc.
// will always get the current values, no lazy-load wrapper needed.
import { prefs } from '../data/store.js';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

/** Full month names, indexed 0–11 */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Abbreviated month names for month keys */
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/** Currency symbols mapped by lowercase currency code */
const CURRENCY_SYMBOLS = {
  ghs: 'GH₵',
  usd: '$',
  gbp: '£',
};

/** Intl.NumberFormat instances cached per currency for performance */
const _formatters = {
  ghs: new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  usd: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  gbp: new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

/** General number formatter for fn() — no decimals, with commas */
const _numberFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Number formatter with 2 decimal places for fs() */
const _signedFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// ═══════════════════════════════════════════════════════════════
// Currency Formatting
// ═══════════════════════════════════════════════════════════════

/**
 * Format a monetary amount with the correct currency symbol
 * and locale-appropriate grouping.
 *
 * @param {number} amount — the value to format
 * @param {string} [currency='ghs'] — 'ghs', 'usd', or 'gbp'
 * @returns {string} — e.g. 'GH₵1,234.56', '$1,234.56', '£1,234.56'
 *
 * @example
 *   fc(1234.5, 'ghs') // → 'GH₵1,234.50'
 *   fc(999, 'usd')     // → '$999.00'
 *   fc(-50.3, 'gbp')   // → '-£50.30'
 */
export function fc(amount, currency = 'ghs') {
  const curr = currency.toLowerCase();
  const symbol = CURRENCY_SYMBOLS[curr] || CURRENCY_SYMBOLS.ghs;
  const formatter = _formatters[curr] || _formatters.ghs;

  // Handle negative amounts: put the minus sign before the symbol
  if (amount < 0) {
    return `-${symbol}${formatter.format(Math.abs(amount))}`;
  }
  return `${symbol}${formatter.format(amount)}`;
}

/**
 * Format a number with commas (no decimals).
 * @param {number} num — the value to format
 * @returns {string} — e.g. '1,234,567'
 */
export function fn(num) {
  if (num == null || isNaN(num)) return '0';
  return _numberFmt.format(num);
}

/**
 * Format a number with a sign prefix: positive gets '+', negative gets '-'.
 * Always shows 2 decimal places.
 *
 * @param {number} num — the value to format
 * @returns {string} — e.g. '+1,234.56' or '-500.00'
 */
export function fs(num) {
  if (num == null || isNaN(num)) return '0.00';
  const prefix = num > 0 ? '+' : num < 0 ? '-' : '';
  return `${prefix}${_signedFmt.format(Math.abs(num))}`;
}

/**
 * Format a decimal as a percentage string.
 * @param {number} num — decimal value (e.g. 0.856)
 * @returns {string} — e.g. '85.6%'
 */
export function fpc(num) {
  if (num == null || isNaN(num)) return '0%';
  return `${(num * 100).toFixed(1)}%`;
}

// ═══════════════════════════════════════════════════════════════
// Date Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Get the current year as a four-digit number.
 * @returns {number} — e.g. 2026
 */
export function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * Get the full month name from a 0-based index.
 * @param {number} index — 0 = January, 11 = December
 * @returns {string} — e.g. 'January'
 */
export function getMonthName(index) {
  return MONTH_NAMES[index] || '';
}

/**
 * Get a month key string from a 0-based index.
 * Month keys are the standard identifier format used throughout
 * the app for selecting and referencing months.
 *
 * @param {number} index — 0 = Jan, 11 = Dec
 * @returns {string} — e.g. 'Jan 2026'
 */
export function getMonthKey(index) {
  const year = getCurrentYear();
  return `${MONTH_ABBR[index]} ${year}`;
}

/**
 * Parse a month key back to its 0-based index.
 * @param {string} monthKey — e.g. 'Jan 2026'
 * @returns {number} — 0-based index, or -1 if not found
 */
export function getMonthIndex(monthKey) {
  if (!monthKey) return -1;
  const abbr = monthKey.split(' ')[0];
  return MONTH_ABBR.indexOf(abbr);
}

/**
 * Get an array of all 12 month keys for the current year.
 * @returns {string[]} — ['Jan 2026', 'Feb 2026', ..., 'Dec 2026']
 */
export function getAllMonths() {
  const year = getCurrentYear();
  return MONTH_ABBR.map(abbr => `${abbr} ${year}`);
}

/**
 * Get the number of days in a month for the current year.
 * Uses Date's day-0 trick: new Date(year, month+1, 0).getDate()
 *
 * @param {number} monthIndex — 0-based month index
 * @returns {number} — days in the month (28–31)
 */
export function getMonthDays(monthIndex) {
  const year = getCurrentYear();
  // Day 0 of the next month = last day of the target month
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Get the current month as a month key string.
 * @returns {string} — e.g. 'May 2026'
 */
export function getCurrentMonthKey() {
  return getMonthKey(new Date().getMonth());
}

/**
 * Get the current month as a 0-based index.
 * @returns {number} — 0 = January, 11 = December
 */
export function getCurrentMonthIndex() {
  return new Date().getMonth();
}

// ── Date-string helpers ──
// All date strings are expected in ISO 'YYYY-MM-DD' format

/**
 * Parse a date string to a Date object set to midnight local time.
 * @param {string} dateStr — 'YYYY-MM-DD'
 * @returns {Date}
 */
function _parseDate(dateStr) {
  // Split and construct manually to avoid timezone offset issues
  // that occur with new Date('YYYY-MM-DD') (parsed as UTC)
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get today's date at midnight (cached per call for consistency).
 * @returns {Date}
 */
function _today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Format a date string for display. Returns relative labels
 * for today/yesterday/tomorrow, otherwise 'Mon DD' format.
 *
 * @param {string} dateStr — 'YYYY-MM-DD'
 * @returns {string} — 'Today', 'Yesterday', 'Tomorrow', or 'May 21'
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';

  const date = _parseDate(dateStr);
  const today = _today();

  // Calculate day difference
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';

  // Default: 'May 21' format
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Format a date string in full human-readable form.
 * @param {string} dateStr — 'YYYY-MM-DD'
 * @returns {string} — e.g. 'Wednesday, May 21, 2026'
 */
export function formatDateFull(dateStr) {
  if (!dateStr) return '';

  const date = _parseDate(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if a date string is before today.
 * @param {string} dateStr — 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return _parseDate(dateStr).getTime() < _today().getTime();
}

/**
 * Check if a date string is today.
 * @param {string} dateStr — 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isToday(dateStr) {
  if (!dateStr) return false;
  return _parseDate(dateStr).getTime() === _today().getTime();
}

/**
 * Calculate the number of days from today until the given date.
 * Returns negative values for dates in the past.
 *
 * @param {string} dateStr — 'YYYY-MM-DD'
 * @returns {number} — days until the date (negative if past)
 */
export function daysUntil(dateStr) {
  if (!dateStr) return 0;
  const diffMs = _parseDate(dateStr).getTime() - _today().getTime();
  return Math.round(diffMs / 86400000);
}

// ═══════════════════════════════════════════════════════════════
// Exchange Rate Utilities
// ═══════════════════════════════════════════════════════════════

/** Default exchange rates (approximate as of May 2026) */
const DEFAULT_GBP_TO_USD = 1.27;
const DEFAULT_GHS_TO_USD = 1 / 16.5;

/**
 * Get the current exchange rates from user preferences,
 * falling back to sensible defaults.
 *
 * @returns {{ gbpToUsd: number, ghsToUsd: number }}
 */
export function getExchangeRates() {
  return {
    gbpToUsd: prefs.gbpToUsd || DEFAULT_GBP_TO_USD,
    ghsToUsd: prefs.ghsToUsd || DEFAULT_GHS_TO_USD,
  };
}

/**
 * Convert an amount from any supported currency to USD.
 * Used for cross-currency totals and analytics.
 *
 * @param {number} amount — the value to convert
 * @param {string} currency — 'ghs', 'usd', or 'gbp'
 * @returns {number} — equivalent in USD
 */
export function toUsd(amount, currency) {
  const curr = currency.toLowerCase();
  if (curr === 'usd') return amount;

  const rates = getExchangeRates();
  if (curr === 'gbp') return amount * rates.gbpToUsd;
  if (curr === 'ghs') return amount * rates.ghsToUsd;

  // Unknown currency — return as-is with a warning
  console.warn(`[utils] toUsd: unknown currency '${currency}'`);
  return amount;
}

// ═══════════════════════════════════════════════════════════════
// Misc Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a unique ID string. Combines a timestamp in base-36
 * with random characters for uniqueness without a UUID library.
 * Format: 'id_<timestamp36>_<random>'
 *
 * @returns {string} — e.g. 'id_lk8f3x2_a9c1'
 */
export function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

/**
 * Debounce a function — delays execution until the caller stops
 * invoking for the specified milliseconds. Useful for search
 * inputs, resize handlers, etc.
 *
 * @param {Function} func — the function to debounce
 * @param {number} [ms=300] — delay in milliseconds
 * @returns {Function} — debounced version of the function
 */
export function debounce(func, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), ms);
  };
}

/**
 * Throttle a function — ensures it's called at most once per
 * the specified interval. Useful for scroll handlers, etc.
 *
 * @param {Function} func — the function to throttle
 * @param {number} [ms=100] — minimum interval in milliseconds
 * @returns {Function} — throttled version of the function
 */
export function throttle(func, ms = 100) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      func(...args);
    }
  };
}

/**
 * Clamp a value between a minimum and maximum.
 * @param {number} val — the value to clamp
 * @param {number} min — lower bound
 * @param {number} max — upper bound
 * @returns {number} — clamped value
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Generate a time-of-day greeting, optionally personalized.
 * Uses the user's local clock to determine morning/afternoon/evening.
 *
 * @param {string} [name] — optional name for personalization
 * @returns {string} — e.g. 'Good morning, Priscilla'
 */
export function greet(name) {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${greeting}, ${name}` : greeting;
}

/**
 * Pick a random emoji from a curated lifestyle-themed set.
 * Used for visual flair in cards, empty states, etc.
 *
 * @returns {string} — a single emoji character
 */
export function randomEmoji() {
  const emojis = [
    '🎯', '🎨', '🎭', '🎪', '🎬', '🎤', '🎵', '🎸',
    '🏋️', '🧘', '✈️', '🏖️', '📚', '💡', '🎓', '🛍️',
    '💇', '🩺', '🏠', '🎂', '💝', '🧩', '🌟', '🔥', '💫',
  ];
  return emojis[Math.floor(Math.random() * emojis.length)];
}
