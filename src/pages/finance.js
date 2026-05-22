// ═══════════════════════════════════════════════════════════════
// LIFE OS — Finance Hub
// Multi-currency overview with budget-vs-actual breakdowns.
// ═══════════════════════════════════════════════════════════════

import { state, exps, getMonthSpend, getMonthBudget, catSpend, getBudgetVal,
         getTotalSpend, getTotalBudget } from '../data/store.js';
import { fc, fn, fpc, getAllMonths, getMonthIndex } from '../lib/utils.js';
import { GHS_CATS, GHS_INC_CATS, USD_CATS, USD_INC_CATS, GBP_CATS, GBP_INC_CATS } from '../data/seedData.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getExpCats(curr) {
  if (curr === 'ghs') return GHS_CATS;
  if (curr === 'usd') return USD_CATS;
  return GBP_CATS;
}

function getIncCats(curr) {
  if (curr === 'ghs') return GHS_INC_CATS;
  if (curr === 'usd') return USD_INC_CATS;
  return GBP_INC_CATS;
}

function currFlag(curr) {
  if (curr === 'ghs') return '🇬🇭';
  if (curr === 'usd') return '🇺🇸';
  return '🇬🇧';
}

// ── Per-currency view ──
function renderCurrencyView(curr) {
  const monthKey = state.selectedMonth;
  const mi       = getMonthIndex(monthKey);
  const expCats  = getExpCats(curr);
  const incCats  = getIncCats(curr);

  const incomeBudget  = getMonthBudget(curr, mi, incCats);
  const actualIncome  = incCats.reduce((sum, cat) => sum + catSpend(curr, monthKey, cat), 0);
  const expenseBudget = getMonthBudget(curr, mi, expCats);
  const actualSpend   = expCats.reduce((sum, cat) => sum + catSpend(curr, monthKey, cat), 0);

  // Stat cards
  const statsHtml = `
    <div class="grid-4 mb-6">
      <div class="card stat-card">
        <div class="stat-label">Income Budget</div>
        <div class="stat-value">${fc(incomeBudget, curr)}</div>
        <div class="stat-sub">${esc(monthKey)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Actual Income</div>
        <div class="stat-value" style="color:var(--accent-teal)">${fc(actualIncome, curr)}</div>
        <div class="stat-sub">${esc(monthKey)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Expense Budget</div>
        <div class="stat-value">${fc(expenseBudget, curr)}</div>
        <div class="stat-sub">${esc(monthKey)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Actual Spend</div>
        <div class="stat-value" style="color:${actualSpend <= expenseBudget ? 'var(--accent-teal)' : 'var(--accent-rose)'}">${fc(actualSpend, curr)}</div>
        <div class="stat-sub">${esc(monthKey)}</div>
      </div>
    </div>`;

  // Category bars
  const barsData = expCats
    .map(cat => ({ cat, spent: catSpend(curr, monthKey, cat), budget: getBudgetVal(curr, cat, mi) }))
    .filter(r => r.budget > 0 || r.spent > 0);

  const barsHtml = barsData.length > 0 ? barsData.map(r => {
    const pct = r.budget > 0 ? Math.min((r.spent / r.budget) * 100, 100) : (r.spent > 0 ? 100 : 0);
    const over = r.spent > r.budget && r.budget > 0;
    const color = over ? 'var(--accent-rose)' : 'var(--accent-teal)';
    return `<div style="margin-bottom:var(--sp-3)">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
        <span class="truncate" style="max-width:55%">${esc(r.cat)}</span>
        <span class="font-mono" style="color:var(--text-secondary);font-size:12px">
          <span ${over ? 'style="color:var(--accent-rose)"' : ''}>${fc(r.spent, curr)}</span>
          <span style="color:var(--text-tertiary)"> / </span>${fc(r.budget, curr)}
        </span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }).join('') : '<div class="empty-state" style="padding:var(--sp-6)"><div class="empty-icon">📊</div><div class="empty-desc">No budget data for this month</div></div>';

  // Year table
  const months = getAllMonths();
  const yearRows = months.map((mk, idx) => {
    const b = getMonthBudget(curr, idx, expCats);
    const s = expCats.reduce((sum, cat) => sum + catSpend(curr, mk, cat), 0);
    const v = b - s;
    const isActive = mk === monthKey;
    let pillCls = 'pill-muted', pillText = '—';
    if (s === 0 && b === 0) { /* keep defaults */ }
    else if (s <= b) { pillCls = 'pill-teal'; pillText = 'On Track'; }
    else { pillCls = 'pill-rose'; pillText = 'Over'; }

    return `<tr class="${isActive ? 'row-active' : ''}">
      <td>${esc(mk)}</td>
      <td class="text-right">${fc(b, curr)}</td>
      <td class="text-right">${fc(s, curr)}</td>
      <td class="text-right" style="color:${v >= 0 ? 'var(--accent-teal)' : 'var(--accent-rose)'}">
        ${v >= 0 ? '+' : ''}${fc(v, curr)}
      </td>
      <td><span class="pill ${pillCls}">${pillText}</span></td>
    </tr>`;
  }).join('');

  return `
    ${statsHtml}
    <div class="card mb-6">
      <div class="section-title" style="margin-bottom:var(--sp-4)">Budget vs Actual — ${esc(monthKey)}</div>
      ${barsHtml}
    </div>
    <div class="card">
      <div class="section-title" style="margin-bottom:var(--sp-4)">Year Overview · ${curr.toUpperCase()}</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th class="text-right">Budget</th>
              <th class="text-right">Spent</th>
              <th class="text-right">Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${yearRows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── Annual view ──
function renderAnnualView() {
  const months = getAllMonths();
  const currencies = ['ghs', 'usd', 'gbp'];

  const ytdCards = currencies.map(curr => {
    const expCats = getExpCats(curr);
    const totalSpent  = getTotalSpend(curr);
    const totalBudget = getTotalBudget(curr, expCats);
    const variance    = totalBudget - totalSpent;
    return `<div class="card stat-card">
      <div class="stat-label">${currFlag(curr)} ${curr.toUpperCase()} — YTD</div>
      <div class="stat-value" style="${totalSpent > totalBudget ? 'color:var(--accent-rose)' : ''}">${fc(totalSpent, curr)}</div>
      <div class="stat-sub">of ${fc(totalBudget, curr)} budget · ${variance >= 0 ? '+' : ''}${fc(variance, curr)}</div>
    </div>`;
  }).join('');

  const incomeCards = currencies.map(curr => {
    const incCats = getIncCats(curr);
    const totalIncome = months.reduce((sum, mk) =>
      sum + incCats.reduce((s, cat) => s + catSpend(curr, mk, cat), 0), 0);
    return `<div class="card stat-card">
      <div class="stat-label">${currFlag(curr)} ${curr.toUpperCase()} Income YTD</div>
      <div class="stat-value" style="color:var(--accent-teal)">${fc(totalIncome, curr)}</div>
    </div>`;
  }).join('');

  // Top GHS categories
  const ghsCatSpend = GHS_CATS.map(cat => {
    const total = months.reduce((sum, mk) => sum + catSpend('ghs', mk, cat), 0);
    return { cat, total };
  })
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  const maxCatSpend = ghsCatSpend.length > 0 ? ghsCatSpend[0].total : 1;
  const topCatBars = ghsCatSpend.map((r, i) => {
    const pct = (r.total / maxCatSpend) * 100;
    const color = i < 3 ? 'var(--accent-teal)' : 'var(--accent-blue)';
    return `<div style="margin-bottom:var(--sp-3)">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
        <span class="truncate" style="max-width:55%">${esc(r.cat)}</span>
        <span class="font-mono" style="color:var(--text-secondary)">${fc(r.total, 'ghs')}</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }).join('') || '<div class="empty-state" style="padding:var(--sp-6)"><div class="empty-icon">📊</div><div class="empty-desc">No GHS expenses recorded yet</div></div>';

  return `
    <div class="grid-3 mb-6">${ytdCards}</div>
    <div class="grid-3 mb-6">${incomeCards}</div>
    <div class="card">
      <div class="section-title" style="margin-bottom:var(--sp-4)">Top GHS Categories — Year to Date</div>
      ${topCatBars}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════════════

export function renderFinance() {
  const curr = state.finCurr || 'ghs';

  const tabs = [
    { key: 'ghs', label: '🇬🇭 GHS' },
    { key: 'usd', label: '🇺🇸 USD' },
    { key: 'gbp', label: '🇬🇧 GBP' },
    { key: 'annual', label: '📊 Annual' },
  ];

  const segHtml = tabs.map(t => `
    <button class="seg-btn ${curr === t.key ? 'active' : ''}"
            data-action="fin-switch-curr"
            data-curr="${t.key}">
      ${t.label}
    </button>`).join('');

  const viewHtml = curr === 'annual' ? renderAnnualView() : renderCurrencyView(curr);

  return `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">💰 Finance Hub</h1>
        <p class="page-sub">Multi-currency financial overview</p>
      </div>
      <div class="seg-control mb-6">${segHtml}</div>
      ${viewHtml}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// BIND
// ═══════════════════════════════════════════════════════════════

export function bindFinance(container) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="fin-switch-curr"]');
    if (!btn) return;
    const newCurr = btn.dataset.curr;
    if (newCurr === state.finCurr) return;
    state.finCurr = newCurr;
    import('../app.js').then(app => app.renderPage());
  });
}
