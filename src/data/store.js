// ═══════════════════════════════════════════════════════════════
// LIFE OS — Central State Management
// Single source of truth with localStorage persistence and a
// subscribe / notify pattern for reactive UI updates.
// ═══════════════════════════════════════════════════════════════

import {
  DEFAULT_BUDGETS_GHS,
  DEFAULT_BUDGETS_USD,
  DEFAULT_BUDGETS_GBP,
  DEFAULT_GOALS,
  DEFAULT_WEALTH,
  DEFAULT_ACTIVITIES,
  DEFAULT_BEAUTY,
  DEFAULT_RHYTHM,
  DEFAULT_RULES,
  DEFAULT_MEALS,
  DEFAULT_TASKS,
  PAY_SCHEDULE,
} from './seedData.js';

// ── localStorage Helpers ──
// Every key is prefixed so LifeOS data never collides with other apps.

const PREFIX = 'los_';

/**
 * Read a value from localStorage, returning `fallback` when the key
 * is missing or JSON parsing fails.
 */
function lget(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Write a value to localStorage as JSON.
 * Silently swallows quota errors to keep the app running.
 */
function lset(key, val) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(val));
  } catch { /* quota exceeded — degrade gracefully */ }
}


// ═══════════════════════════════════════════════════════════════
// UI STATE  (ephemeral — not persisted to localStorage)
// ═══════════════════════════════════════════════════════════════

export const state = {
  /** Currently active page / route slug */
  currentPage: 'overview',

  /** Selected month key, e.g. "May 2026".  Set in initData(). */
  selectedMonth: null,

  /** Active currency tab on the Expenses page */
  expCurr: 'ghs',

  /** Active currency tab on the Financial overview */
  finCurr: 'ghs',

  /** Active budget sub-tab identifier */
  budTab: 'ghs_monthly',

  /** Task view mode — 'list' (default) or 'board' (kanban) */
  taskView: 'list',

  /** Active filters on the Tasks page */
  taskFilters: {
    role: '',
    priority: '',
    status: '',
    workType: '',
    search: '',
  },

  /** Active tab on the Life page */
  lifeTab: 'activities',

  /** Whether the global search overlay is open */
  searchOpen: false,
};


// ═══════════════════════════════════════════════════════════════
// PERSISTED DATA
// Each variable is loaded from localStorage in initData() and
// saved back via its dedicated save*() helper.
// ═══════════════════════════════════════════════════════════════

/** Expenses by currency: { ghs: [...], usd: [...], gbp: [...] } */
export let exps = {};

/** Wealth tracker rows — one per month */
export let wrows = [];

/** Savings goals */
export let goals = [];

/** Planned activities calendar */
export let activities = [];

/** Beauty calendar entries */
export let beauty = [];

/** Calendar activities keyed by date: { 'YYYY-MM-DD': [{text, time, color}] } */
export let calActs = {};

/** Daily rhythm schedule: [[time, activity], ...] */
export let rhythm = [];

/** Personal rules (array of strings) */
export let rules = [];

/** Meal plan: [{day, b, l, d, g}, ...] */
export let meals = [];

/** GHS budget overrides: { 'category_monthIndex': value } */
export let ghsBudgets = {};

/** USD budget overrides */
export let usdBudgets = {};

/** GBP budget overrides */
export let gbpBudgets = {};

/** Task list */
export let tasks = [];

/** User preferences and settings */
export let prefs = {};


// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION SYSTEM
// Any module can subscribe to data changes. Calling notify()
// invokes every registered listener (used to trigger re-renders).
// ═══════════════════════════════════════════════════════════════

const _listeners = new Set();

/**
 * Register a callback that fires on every notify().
 * Returns an unsubscribe function.
 */
export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/**
 * Notify all subscribers that data has changed.
 * Errors in individual listeners are caught so one bad subscriber
 * can never take down the others.
 */
export function notify() {
  _listeners.forEach(fn => {
    try { fn(); }
    catch (e) { console.error('Subscriber error:', e); }
  });
}


// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// Called once on app boot — loads everything from localStorage
// (or seeds with defaults on first run).
// ═══════════════════════════════════════════════════════════════

export function initData() {
  // ── 1. Preferences (needed first — has exchange rates, user name, etc.) ──
  prefs = lget('prefs', {
    name: 'Priscilla',
    appTitle: 'Life OS',
    subtitle: 'Personal Command Centre',
    gbpToUsd: 1.27,
    ghsToUsd: 1 / 16.5,
    gasUrl: 'https://script.google.com/macros/s/AKfycbwZNSgTAaBPGlprgZslo7-PY2ZBQtojqnMpS85iMIOkIkCaVmZTlVB4JQZIF-VlRFI1/exec',
    autoSync: true,
  });

  // ── 2. Selected month — defaults to the current calendar month ──
  const now = new Date();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const year = now.getFullYear();
  state.selectedMonth = lget('selectedMonth', `${monthNames[now.getMonth()]} ${year}`);

  // ── 3. All persisted data with seed defaults ──
  exps        = lget('exps',        { ghs: [], usd: [], gbp: [] });
  wrows       = lget('wrows',       DEFAULT_WEALTH);
  goals       = lget('goals',       DEFAULT_GOALS);
  activities  = lget('activities',  DEFAULT_ACTIVITIES);
  beauty      = lget('beauty',      DEFAULT_BEAUTY);
  calActs     = lget('calActs',     {});
  rhythm      = lget('rhythm',      DEFAULT_RHYTHM);
  rules       = lget('rules',       DEFAULT_RULES);
  meals       = lget('meals',       DEFAULT_MEALS);
  ghsBudgets  = lget('ghsBudgets',  DEFAULT_BUDGETS_GHS);
  usdBudgets  = lget('usdBudgets',  DEFAULT_BUDGETS_USD);
  gbpBudgets  = lget('gbpBudgets',  DEFAULT_BUDGETS_GBP);
  tasks       = lget('tasks',       DEFAULT_TASKS);
}


// ═══════════════════════════════════════════════════════════════
// SAVE HELPERS
// Each one persists its data slice to localStorage and fires
// notify() so the UI can re-render.
// ═══════════════════════════════════════════════════════════════

export function saveExps()        { lset('exps', exps);               notify(); }
export function saveWrows()       { lset('wrows', wrows);             notify(); }
export function saveGoals()       { lset('goals', goals);             notify(); }
export function saveActivities()  { lset('activities', activities);   notify(); }
export function saveBeauty()      { lset('beauty', beauty);           notify(); }
export function saveCalActs()     { lset('calActs', calActs);         notify(); }
export function saveRhythm()      { lset('rhythm', rhythm);           notify(); }
export function saveRules()       { lset('rules', rules);             notify(); }
export function saveMeals()       { lset('meals', meals);             notify(); }
export function saveGhsBudgets()  { lset('ghsBudgets', ghsBudgets);   notify(); }
export function saveUsdBudgets()  { lset('usdBudgets', usdBudgets);   notify(); }
export function saveGbpBudgets()  { lset('gbpBudgets', gbpBudgets);   notify(); }
export function saveTasks()       { lset('tasks', tasks);             notify(); }
export function savePrefs()       { lset('prefs', prefs);             notify(); }

/** Persist selected month without triggering a full re-render */
export function saveSelectedMonth() { lset('selectedMonth', state.selectedMonth); }


// ═══════════════════════════════════════════════════════════════
// BUDGET HELPERS
// Read / write budget values from the flat { "cat_monthIndex": val }
// objects.  Month index is 0-11 (Jan-Dec).
// ═══════════════════════════════════════════════════════════════

/**
 * Look up the budget value for a category in a given month.
 * Returns 0 when no value has been set.
 */
export function getBudgetVal(currency, category, monthIndex) {
  const key = `${category}_${monthIndex}`;
  const budgets = currency === 'ghs' ? ghsBudgets
                : currency === 'usd' ? usdBudgets
                : gbpBudgets;
  return budgets[key] !== undefined ? budgets[key] : 0;
}

/**
 * Set (override) a budget value for a category/month and persist.
 */
export function setBudgetVal(currency, category, monthIndex, value) {
  const key = `${category}_${monthIndex}`;
  if (currency === 'ghs')      { ghsBudgets[key] = value; saveGhsBudgets(); }
  else if (currency === 'usd') { usdBudgets[key] = value; saveUsdBudgets(); }
  else                         { gbpBudgets[key] = value; saveGbpBudgets(); }
}

/**
 * Sum the budgets for all provided categories within a single month.
 */
export function getMonthBudget(currency, monthIndex, categories) {
  return categories.reduce(
    (sum, cat) => sum + getBudgetVal(currency, cat, monthIndex),
    0,
  );
}


// ═══════════════════════════════════════════════════════════════
// EXPENSE HELPERS
// Convenience wrappers that filter, sum, and slice the expense
// arrays so page modules don't have to repeat this logic.
// ═══════════════════════════════════════════════════════════════

/**
 * All expenses for a currency within a given month key (e.g. "May 2026").
 */
export function getMonthExpenses(currency, monthKey) {
  return (exps[currency] || []).filter(e => e.month === monthKey);
}

/**
 * Total spend for a currency in a month.
 */
export function getMonthSpend(currency, monthKey) {
  return getMonthExpenses(currency, monthKey)
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
}

/**
 * Spend for a single category within a specific month.
 * Correctly filters by both month AND category before summing.
 */
export function catSpend(currency, monthKey, category) {
  return getMonthExpenses(currency, monthKey)
    .filter(e => e.category === category)
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
}

/**
 * Total spend across ALL months for a given currency.
 */
export function getTotalSpend(currency) {
  return (exps[currency] || [])
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
}

/**
 * Total budget across all 12 months for a given currency and set
 * of categories.
 */
export function getTotalBudget(currency, categories) {
  let total = 0;
  for (let m = 0; m < 12; m++) {
    total += getMonthBudget(currency, m, categories);
  }
  return total;
}


// ═══════════════════════════════════════════════════════════════
// EXPORT / IMPORT  (for sync & backup)
// ═══════════════════════════════════════════════════════════════

/**
 * Bundle every piece of persisted state into a single JSON-safe
 * object suitable for cloud sync or file download.
 */
export function exportAllData() {
  return {
    exps,
    wrows,
    goals,
    activities,
    beauty,
    calActs,
    rhythm,
    rules,
    meals,
    ghsBudgets,
    usdBudgets,
    gbpBudgets,
    tasks,
    prefs,
    payChecks: getAllPayChecks(),
    exportedAt: new Date().toISOString(),
    version: 2,
  };
}

/**
 * Merge incoming data into local state.  Only keys that exist in
 * the payload are touched — the rest remain as-is.
 */
export function importAllData(data) {
  if (data.exps)        { exps        = data.exps;        lset('exps',        exps);        }
  if (data.wrows)       { wrows       = data.wrows;       lset('wrows',       wrows);       }
  if (data.goals)       { goals       = data.goals;       lset('goals',       goals);       }
  if (data.activities)  { activities  = data.activities;  lset('activities',  activities);  }
  if (data.beauty)      { beauty      = data.beauty;      lset('beauty',      beauty);      }
  if (data.calActs)     { calActs     = data.calActs;     lset('calActs',     calActs);     }
  if (data.rhythm)      { rhythm      = data.rhythm;      lset('rhythm',      rhythm);      }
  if (data.rules)       { rules       = data.rules;       lset('rules',       rules);       }
  if (data.meals)       { meals       = data.meals;       lset('meals',       meals);       }
  if (data.ghsBudgets)  { ghsBudgets  = data.ghsBudgets;  lset('ghsBudgets',  ghsBudgets);  }
  if (data.usdBudgets)  { usdBudgets  = data.usdBudgets;  lset('usdBudgets',  usdBudgets);  }
  if (data.gbpBudgets)  { gbpBudgets  = data.gbpBudgets;  lset('gbpBudgets',  gbpBudgets);  }
  if (data.tasks)       { tasks       = data.tasks;       lset('tasks',       tasks);       }

  // Prefs are merged (not replaced) so local-only keys survive
  if (data.prefs) {
    Object.assign(prefs, data.prefs);
    lset('prefs', prefs);
  }

  // Restore pay-check state per month
  if (data.payChecks) {
    Object.entries(data.payChecks).forEach(([month, checks]) => {
      lset('paycheck_' + month, checks);
    });
  }

  notify();
}


// ═══════════════════════════════════════════════════════════════
// PAY-CHECK HELPERS
// Track which line items on the PAY_SCHEDULE have been ticked
// off for a given month.
// ═══════════════════════════════════════════════════════════════

/**
 * Get the checked-state map for a month.
 * Returns an object like { 0: true, 3: true } where keys are
 * PAY_SCHEDULE row indices.
 */
export function getPayChecks(monthKey) {
  return lget('paycheck_' + monthKey, {});
}

/**
 * Toggle a single pay-check item for a given month.
 */
export function setPayCheck(monthKey, idx, checked) {
  const checks = getPayChecks(monthKey);
  checks[idx] = checked;
  lset('paycheck_' + monthKey, checks);
}

/**
 * Collect pay-check data across all months of the current year
 * (used by exportAllData).
 */
export function getAllPayChecks() {
  const result = {};
  const months = getAllMonthKeys();
  months.forEach(m => {
    const checks = lget('paycheck_' + m, null);
    if (checks) result[m] = checks;
  });
  return result;
}


// ═══════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Build month keys ("Jan 2026", "Feb 2026", …) for the current year.
 */
function getAllMonthKeys() {
  const year = new Date().getFullYear();
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    .map(m => `${m} ${year}`);
}

/**
 * Wipe every LifeOS key from localStorage, re-seed with defaults,
 * and notify subscribers.  Used by the Settings → Reset button.
 */
export function clearAllData(blankSlate = false) {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
  
  if (blankSlate) {
    lset('wrows', []);
    lset('goals', []);
    lset('activities', []);
    lset('beauty', []);
    lset('rhythm', []);
    lset('rules', []);
    lset('meals', []);
    lset('tasks', []);
  }
  
  initData();
  notify();
}

/**
 * Approximate byte size of all LifeOS data in localStorage.
 * Useful for showing a "storage used" indicator in Settings.
 * (JavaScript strings are UTF-16 → 2 bytes per character.)
 */
export function getStorageUsage() {
  let total = 0;
  let count = 0;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PREFIX)) {
      total += localStorage.getItem(key).length * 2;
      count++;
    }
  }
  const kb = (total / 1024).toFixed(1);
  return {
    bytes: total,
    keys: count,
    display: total < 1024 ? `${total} B` : total < 1048576 ? `${kb} KB` : `${(total / 1048576).toFixed(2)} MB`,
  };
}
