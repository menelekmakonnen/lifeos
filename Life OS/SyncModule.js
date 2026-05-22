// ════════════════════════════════════════════════════════════════════════════
// LIFE OS 2026 — Google Sheets Sync Module
// Add this <script> block to your HTML file just before the closing </script>
// Replace GAS_URL with your deployed Web App URL.
// ════════════════════════════════════════════════════════════════════════════

// ── CONFIG ────────────────────────────────────────────────────────────────────
const GAS_URL = 'YOUR_WEB_APP_URL_HERE';
// Example: 'https://script.google.com/macros/s/AKfyc.../exec'

// ── SYNC STATE ────────────────────────────────────────────────────────────────
let syncBusy = false;

// ── CORE REQUEST ─────────────────────────────────────────────────────────────
async function gasRequest(method, body) {
  if (!GAS_URL || GAS_URL.includes('YOUR_WEB_APP')) {
    toast('⚠ Sheets URL not configured');
    return null;
  }
  try {
    const opts = method === 'GET'
      ? { method: 'GET' }
      : {
          method : 'POST',
          body   : JSON.stringify(body),
          headers: { 'Content-Type': 'text/plain' }, // avoids CORS preflight
        };
    const res  = await fetch(GAS_URL + (method === 'GET' ? '?action=pull' : ''), opts);
    const data = await res.json();
    if (data.error) { console.error('GAS error:', data.error); return null; }
    return data;
  } catch (err) {
    console.error('Sync error:', err);
    return null;
  }
}

// ── PULL FROM SHEETS → localStorage ──────────────────────────────────────────
async function syncPull() {
  if (syncBusy) return;
  syncBusy = true;
  toast('⟳ Pulling from Google Sheets…');
  const data = await gasRequest('GET');
  if (!data) { syncBusy = false; toast('✗ Pull failed'); return; }

  // Restore all data objects
  if (data.exps)       { exps        = data.exps;       lset('exps',       exps);       }
  if (data.wrows)      { wrows       = data.wrows;      lset('wrows',      wrows);      }
  if (data.goals)      { goals       = data.goals;      lset('goals',      goals);      }
  if (data.activities) { activities  = data.activities; lset('activities', activities); }
  if (data.beauty)     { beauty      = data.beauty;     lset('beauty',     beauty);     }
  if (data.calActs)    { calActs     = data.calActs;    lset('calActs',    calActs);    }
  if (data.rhythm)     { rhythm      = data.rhythm;     lset('rhythm',     rhythm);     }
  if (data.rules)      { rules       = data.rules;      lset('rules',      rules);      }
  if (data.meals)      { meals       = data.meals;      lset('meals',      meals);      }
  if (data.ghsBudgets) { ghsBudgets  = data.ghsBudgets; lset('ghsBudgets', ghsBudgets); }
  if (data.usdBudgets) { usdBudgets  = data.usdBudgets; lset('usdBudgets', usdBudgets); }
  if (data.gbpBudgets) { gbpBudgets  = data.gbpBudgets; lset('gbpBudgets', gbpBudgets); }

  // Restore pay checks for all months
  if (data.payChecks) {
    Object.entries(data.payChecks).forEach(([month, checks]) => {
      lset('paycheck_' + month, checks);
    });
  }

  renderCurrentPage();
  syncBusy = false;
  toast('✓ Pulled from Google Sheets · ' + new Date().toLocaleTimeString());
}

// ── PUSH localhost → Sheets (full snapshot) ───────────────────────────────────
async function syncPush() {
  if (syncBusy) return;
  syncBusy = true;
  toast('⟳ Pushing to Google Sheets…');

  // Gather all pay check data across months
  const payChecks = {};
  ALL_MONTHS.forEach(m => {
    const checks = lget('paycheck_' + m, null);
    if (checks) payChecks[m] = checks;
  });

  const payload = {
    exps, wrows, goals, activities, beauty, calActs,
    rhythm, rules, meals, ghsBudgets, usdBudgets, gbpBudgets,
    payChecks,
  };

  const result = await gasRequest('POST', { action: 'push_all', payload });
  syncBusy = false;
  if (result && result.ok) {
    toast('✓ Pushed to Google Sheets · ' + new Date().toLocaleTimeString());
  } else {
    toast('✗ Push failed — check console');
  }
}

// ── GRANULAR SAVES (call after each mutation) ──────────────────────────────────
// These run silently in the background — no await needed at call site.

async function gasSaveExpense(curr, exp, idx) {
  await gasRequest('POST', { action: 'save_expense', payload: { curr, exp, idx } });
}

async function gasDeleteExpense(curr, idx) {
  await gasRequest('POST', { action: 'delete_expense', payload: { curr, idx } });
}

async function gasSaveWealth(row, idx) {
  await gasRequest('POST', { action: 'save_wealth', payload: { row, idx } });
}

async function gasSaveGoal(goal, idx) {
  await gasRequest('POST', { action: 'save_goal', payload: { goal, idx } });
}

async function gasDeleteGoal(idx) {
  await gasRequest('POST', { action: 'delete_goal', payload: { idx } });
}

async function gasSaveBudgets(type, budgets) {
  await gasRequest('POST', { action: 'save_budgets', payload: { type, budgets } });
}

async function gasSavePayChecks(month, checks) {
  await gasRequest('POST', { action: 'save_pay_checks', payload: { month, checks } });
}

async function gasSaveCalActs() {
  await gasRequest('POST', { action: 'save_cal_acts', payload: { calActs } });
}

async function gasSaveRhythm() {
  await gasRequest('POST', { action: 'save_rhythm', payload: { rhythm } });
}

async function gasSaveMeals() {
  await gasRequest('POST', { action: 'save_meals', payload: { meals } });
}

async function gasSaveRules() {
  await gasRequest('POST', { action: 'save_rules', payload: { rules } });
}

async function gasSaveBeauty() {
  await gasRequest('POST', { action: 'save_beauty', payload: { beauty } });
}

async function gasSaveActivities() {
  await gasRequest('POST', { action: 'save_activities', payload: { activities } });
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
async function syncHealth() {
  if (!GAS_URL || GAS_URL.includes('YOUR_WEB_APP')) {
    toast('⚠ Sheets URL not set in GAS_URL constant');
    return;
  }
  try {
    const res  = await fetch(GAS_URL + '?action=health');
    const data = await res.json();
    if (data.ok) toast('✓ Sheets connected · ' + data.ts.slice(0,19).replace('T',' '));
    else         toast('✗ Sheets responded with error');
  } catch {
    toast('✗ Cannot reach Sheets — check URL or deployment');
  }
}
