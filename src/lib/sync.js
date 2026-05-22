// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Google Sheets Sync Module
// Bidirectional sync with Apps Script backend
// ═══════════════════════════════════════════════════════════════

import { prefs, exportAllData, importAllData, savePrefs } from '../data/store.js';

// ── Sync State ──────────────────────────────────────────────
let _busy = false;
let _lastSync = null;
let _status = 'idle'; // 'idle' | 'syncing' | 'error' | 'success'
const _statusListeners = new Set();

export function getSyncStatus() {
  return { busy: _busy, lastSync: _lastSync, status: _status };
}

export function onSyncStatus(fn) {
  _statusListeners.add(fn);
  return () => _statusListeners.delete(fn);
}

function setStatus(s) {
  _status = s;
  _statusListeners.forEach(fn => { try { fn(getSyncStatus()); } catch {} });
}

// ── Core Request ────────────────────────────────────────────
function getUrl() {
  return prefs.gasUrl || '';
}

function isConfigured() {
  const url = getUrl();
  return url && url.startsWith('https://script.google.com');
}

async function gasRequest(method, body) {
  if (!isConfigured()) {
    return { error: 'Google Sheets URL not configured' };
  }
  try {
    const opts = method === 'GET'
      ? { method: 'GET' }
      : {
          method: 'POST',
          body: JSON.stringify(body),
          // text/plain avoids CORS preflight with Apps Script
          headers: { 'Content-Type': 'text/plain' },
        };
    
    const url = getUrl() + (method === 'GET' ? '?action=pull' : '');
    const res = await fetch(url, opts);
    const data = await res.json();
    
    if (data.error) {
      console.error('[Sync] GAS error:', data.error);
      return { error: data.error };
    }
    return data;
  } catch (err) {
    console.error('[Sync] Request failed:', err);
    return { error: err.message };
  }
}

// ── Health Check ────────────────────────────────────────────
export async function checkHealth() {
  if (!isConfigured()) return { ok: false, error: 'Not configured' };
  try {
    const res = await fetch(getUrl() + '?action=health');
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Pull (Sheets → App) ────────────────────────────────────
export async function syncPull() {
  if (_busy) return { error: 'Sync already in progress' };
  if (!isConfigured()) return { error: 'Not configured' };
  
  _busy = true;
  setStatus('syncing');
  
  try {
    const data = await gasRequest('GET');
    if (data.error) {
      setStatus('error');
      _busy = false;
      return data;
    }
    
    // Import the pulled data into localStorage
    importAllData(data);
    
    _lastSync = new Date().toISOString();
    setStatus('success');
    _busy = false;
    
    // Reset status after 3 seconds
    setTimeout(() => setStatus('idle'), 3000);
    
    return { ok: true, pulledAt: _lastSync };
  } catch (err) {
    setStatus('error');
    _busy = false;
    return { error: err.message };
  }
}

// ── Push (App → Sheets) ────────────────────────────────────
export async function syncPush() {
  if (_busy) return { error: 'Sync already in progress' };
  if (!isConfigured()) return { error: 'Not configured' };
  
  _busy = true;
  setStatus('syncing');
  
  try {
    const payload = exportAllData();
    const result = await gasRequest('POST', { action: 'push_all', payload });
    
    if (result.error) {
      setStatus('error');
      _busy = false;
      return result;
    }
    
    _lastSync = new Date().toISOString();
    setStatus('success');
    _busy = false;
    
    setTimeout(() => setStatus('idle'), 3000);
    
    return { ok: true, pushedAt: _lastSync };
  } catch (err) {
    setStatus('error');
    _busy = false;
    return { error: err.message };
  }
}

// ── Granular Saves (fire-and-forget background sync) ────────
// These run silently alongside localStorage saves.

export async function gasSaveExpense(curr, exp, idx) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_expense', payload: { curr, exp, idx } });
}

export async function gasDeleteExpense(curr, idx) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'delete_expense', payload: { curr, idx } });
}

export async function gasSaveWealth(row, idx) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_wealth', payload: { row, idx } });
}

export async function gasSaveGoal(goal, idx) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_goal', payload: { goal, idx } });
}

export async function gasDeleteGoal(idx) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'delete_goal', payload: { idx } });
}

export async function gasSaveBudgets(type, budgets) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_budgets', payload: { type, budgets } });
}

export async function gasSavePayChecks(month, checks) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_pay_checks', payload: { month, checks } });
}

export async function gasSaveCalActs(calActs) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_cal_acts', payload: { calActs } });
}

export async function gasSaveRhythm(rhythm) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_rhythm', payload: { rhythm } });
}

export async function gasSaveMeals(meals) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_meals', payload: { meals } });
}

export async function gasSaveRules(rules) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_rules', payload: { rules } });
}

export async function gasSaveBeauty(beauty) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_beauty', payload: { beauty } });
}

export async function gasSaveActivities(activities) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_activities', payload: { activities } });
}

// Task-specific sync (uses the task sheet format)
export async function gasSaveTask(task) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'save_task', payload: { task } });
}

export async function gasDeleteTask(taskId) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'delete_task', payload: { id: taskId } });
}

export async function gasSyncAllTasks(tasks) {
  if (!isConfigured() || !prefs.autoSync) return;
  await gasRequest('POST', { action: 'sync_tasks', payload: { tasks } });
}

// ── Live Exchange Rates ─────────────────────────────────────
// Fetches from a free public API (no key needed)
// Falls back to stored prefs if fetch fails

const RATE_CACHE_KEY = 'los_exchange_rates_cache';
const RATE_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

export async function fetchExchangeRates() {
  try {
    // Check cache first
    const cached = localStorage.getItem(RATE_CACHE_KEY);
    if (cached) {
      const { rates, fetchedAt } = JSON.parse(cached);
      if (Date.now() - fetchedAt < RATE_CACHE_TTL) {
        return rates;
      }
    }
    
    // Fetch from free API (no key required)
    // Using exchangerate.host which is free and doesn't need API keys
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error('Rate fetch failed');
    const data = await res.json();
    
    if (data.result === 'success' && data.rates) {
      const rates = {
        gbpToUsd: 1 / (data.rates.GBP || 0.79),
        ghsToUsd: 1 / (data.rates.GHS || 16.5),
        usdToGbp: data.rates.GBP || 0.79,
        usdToGhs: data.rates.GHS || 16.5,
      };
      
      // Cache the rates
      localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({
        rates,
        fetchedAt: Date.now(),
      }));
      
      // Also update prefs
      prefs.gbpToUsd = rates.gbpToUsd;
      prefs.ghsToUsd = rates.ghsToUsd;
      savePrefs();
      
      return rates;
    }
    throw new Error('Invalid rate data');
  } catch (err) {
    console.warn('[Sync] Exchange rate fetch failed, using stored rates:', err.message);
    return {
      gbpToUsd: prefs.gbpToUsd || 1.27,
      ghsToUsd: prefs.ghsToUsd || (1 / 16.5),
      usdToGbp: 1 / (prefs.gbpToUsd || 1.27),
      usdToGhs: 1 / (prefs.ghsToUsd || (1 / 16.5)),
    };
  }
}

// ── Auto-Sync on Data Change ────────────────────────────────
// Call this during app init to set up auto-push on changes
let _autoSyncTimer = null;

export function setupAutoSync() {
  if (!prefs.autoSync || !isConfigured()) return;
  
  // Debounced auto-push: wait 5 seconds after last change
  // This prevents hammering the API on rapid edits
  return () => {
    if (!prefs.autoSync) return;
    clearTimeout(_autoSyncTimer);
    _autoSyncTimer = setTimeout(() => {
      syncPush().catch(err => console.warn('[Sync] Auto-push failed:', err));
    }, 5000);
  };
}
