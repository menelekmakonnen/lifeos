// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Analytics Dashboard
// Premium data visualisations using pure CSS — no charting lib.
// ═══════════════════════════════════════════════════════════════

import {
  state, exps, tasks, goals, wrows,
  getMonthSpend, getTotalSpend, getMonthBudget, getTotalBudget, catSpend,
} from '../data/store.js';
import {
  fc, fn, fpc, toUsd, getExchangeRates, getAllMonths, getMonthIndex,
} from '../lib/utils.js';
import { GHS_CATS, USD_CATS, GBP_CATS, ROLES } from '../data/seedData.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════

export function renderAnalytics() {
  const months = getAllMonths();
  const rates = getExchangeRates();

  // ── YTD Totals ──
  const ghsSpend  = getTotalSpend('ghs');
  const ghsBudget = getTotalBudget('ghs', GHS_CATS);
  const usdSpend  = getTotalSpend('usd');

  const latestRow = [...wrows].reverse().find(r =>
    (r.usd || 0) + (r.gbp || 0) + (r.ghs || 0) > 0
  ) || wrows[wrows.length - 1] || {};
  const netWorth =
    (latestRow.usd || 0) +
    (latestRow.gbp || 0) * rates.gbpToUsd +
    (latestRow.ghs || 0) * rates.ghsToUsd -
    (latestRow.debts || 0);

  // ── 1. STAT CARDS ──
  const statsHtml = `
    <div class="grid-4 mb-6 fade-in fade-in-delay-1">
      <div class="card stat-card">
        <div class="stat-label">GHS Spend YTD</div>
        <div class="stat-value">${fc(ghsSpend, 'ghs')}</div>
        <div class="stat-sub">Total year spending</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">GHS Budget YTD</div>
        <div class="stat-value" style="color:${ghsSpend <= ghsBudget ? 'var(--accent-teal)' : 'var(--accent-rose)'}">${fc(ghsBudget, 'ghs')}</div>
        <div class="stat-sub">${ghsSpend <= ghsBudget ? 'Under budget ✓' : 'Over budget ✗'}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">USD Spend YTD</div>
        <div class="stat-value">${fc(usdSpend, 'usd')}</div>
        <div class="stat-sub">Total year spending</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Net Worth</div>
        <div class="stat-value" style="color:var(--accent-gold)">${fc(netWorth, 'usd')}</div>
        <div class="stat-sub">Latest snapshot</div>
      </div>
    </div>`;

  // ── 2. GHS CATEGORY CHART ──
  const catTotals = GHS_CATS.map(cat => {
    let total = 0;
    months.forEach(mk => { total += catSpend('ghs', mk, cat); });
    return { cat, total };
  })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const maxCat = catTotals.length > 0 ? catTotals[0].total : 1;

  const catBarsHtml = catTotals.length > 0 ? catTotals.map((c, i) => {
    const pct = (c.total / maxCat) * 100;
    const color = i < 3 ? 'var(--accent-teal)' : i < 8 ? 'var(--accent-blue)' : 'var(--bg-surface-3)';
    return `<div style="margin-bottom:var(--sp-3)">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
        <span class="truncate" style="max-width:60%">${esc(c.cat)}</span>
        <span class="font-mono" style="color:var(--text-secondary)">${fc(c.total, 'ghs')}</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }).join('') : '<div class="empty-state" style="padding:var(--sp-6)"><div class="empty-icon">📊</div><div class="empty-desc">No expense data yet</div></div>';

  // ── 3. MONTHLY SPEND VS BUDGET CHART ──
  const monthData = months.map((mk, i) => {
    const spend = getMonthSpend('ghs', mk);
    const budget = getMonthBudget('ghs', i, GHS_CATS);
    return { label: mk.split(' ')[0], spend, budget };
  });
  const maxBar = Math.max(...monthData.map(d => Math.max(d.spend, d.budget)), 1);

  const monthBarsHtml = monthData.map(d => {
    const spendH = Math.max((d.spend / maxBar) * 100, d.spend > 0 ? 2 : 0);
    const budgetH = (d.budget / maxBar) * 100;
    const isOver = d.spend > d.budget && d.budget > 0;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:var(--sp-1)">
      <div style="width:100%;position:relative;display:flex;flex-direction:column;justify-content:flex-end;height:100%">
        <div style="width:70%;margin:0 auto;border-radius:var(--radius-sm) var(--radius-sm) 0 0;background:${isOver ? 'var(--accent-rose)' : 'var(--accent-blue)'};height:${spendH}%;min-height:${d.spend > 0 ? 2 : 0}px;transition:height 0.4s var(--ease-out)"></div>
        ${d.budget > 0 ? `<div style="position:absolute;left:0;right:0;bottom:${budgetH}%;height:2px;background:var(--accent-gold);border-radius:1px"></div>` : ''}
      </div>
      <span style="font-size:10px;color:var(--text-tertiary)">${d.label}</span>
    </div>`;
  }).join('');

  // ── 4. FOREIGN CURRENCY SUMMARY ──
  const usdBudget = getTotalBudget('usd', USD_CATS);
  const gbpSpend  = getTotalSpend('gbp');
  const gbpBudget = getTotalBudget('gbp', GBP_CATS);

  // ── 5. TASK METRICS ──
  const totalTasks = tasks.length;
  const doneTasks  = tasks.filter(t => t.status === 'Done').length;
  const completionRate = totalTasks > 0 ? doneTasks / totalTasks : 0;

  // By role
  const roleCounts = {};
  ROLES.forEach(r => { roleCounts[r.id] = 0; });
  tasks.forEach(t => { roleCounts[t.role] = (roleCounts[t.role] || 0) + 1; });
  const maxRoleCount = Math.max(...Object.values(roleCounts), 1);

  const roleBarHtml = ROLES.map(r => {
    const count = roleCounts[r.id] || 0;
    const pct = (count / maxRoleCount) * 100;
    return `<div style="margin-bottom:var(--sp-3)">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
        <span>${r.emoji} ${esc(r.name)}</span>
        <span class="font-mono" style="color:var(--text-secondary)">${count}</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%;background:${r.color}"></div></div>
    </div>`;
  }).join('');

  // By priority — donut
  const priCounts = { High: 0, Medium: 0, Low: 0 };
  tasks.forEach(t => { if (priCounts[t.priority] !== undefined) priCounts[t.priority]++; });
  const priTotal = priCounts.High + priCounts.Medium + priCounts.Low;
  const priColors = { High: 'var(--accent-rose)', Medium: 'var(--accent-gold)', Low: 'var(--accent-teal)' };

  let conicStops = 'var(--bg-surface-3) 0% 100%';
  if (priTotal > 0) {
    let offset = 0;
    const stops = [];
    ['High', 'Medium', 'Low'].forEach(key => {
      const pct = (priCounts[key] / priTotal) * 100;
      stops.push(`${priColors[key]} ${offset}% ${offset + pct}%`);
      offset += pct;
    });
    conicStops = stops.join(', ');
  }

  // ── 6. HEALTH SCORE ──
  const overBudget = Math.max(0, ghsSpend - ghsBudget);
  const budgetAdherence = ghsBudget > 0 ? Math.max(0, 1 - overBudget / ghsBudget) : 1;
  const totalSaved  = goals.reduce((s, g) => s + (g.s || 0), 0);
  const totalTarget = goals.reduce((s, g) => s + (g.t || 0), 0);
  const savingsRate = totalTarget > 0 ? Math.min(1, totalSaved / totalTarget) : 0;
  const taskRate = totalTasks > 0 ? doneTasks / totalTasks : 0;
  const score = (budgetAdherence * 0.4) + (savingsRate * 0.3) + (taskRate * 0.3);
  const scorePct = score * 100;
  const scoreColor = scorePct >= 70 ? 'var(--accent-teal)' : scorePct >= 40 ? 'var(--accent-gold)' : 'var(--accent-rose)';

  return `
    <div class="page-header fade-in">
      <h1 class="page-title">📊 Analytics</h1>
      <p class="page-sub">Year-to-date insights across finances & tasks</p>
    </div>

    ${statsHtml}

    <!-- GHS Category + Monthly Chart -->
    <div class="grid-2 mb-6 fade-in fade-in-delay-2">
      <div class="card">
        <div class="section-title" style="margin-bottom:var(--sp-4)">🏷️ GHS Spend by Category</div>
        ${catBarsHtml}
      </div>
      <div class="card">
        <div class="section-title" style="margin-bottom:var(--sp-4)">📈 Monthly GHS Spend vs Budget</div>
        <div style="display:flex;align-items:flex-end;gap:var(--sp-1);height:200px;padding-top:var(--sp-4)">
          ${monthBarsHtml}
        </div>
        <div style="display:flex;gap:var(--sp-4);margin-top:var(--sp-3);justify-content:center">
          <span style="display:flex;align-items:center;gap:var(--sp-2);font-size:11px;color:var(--text-tertiary)">
            <span style="width:10px;height:10px;border-radius:2px;background:var(--accent-blue)"></span> Spend
          </span>
          <span style="display:flex;align-items:center;gap:var(--sp-2);font-size:11px;color:var(--text-tertiary)">
            <span style="width:16px;height:2px;background:var(--accent-gold);border-radius:1px"></span> Budget
          </span>
        </div>
      </div>
    </div>

    <!-- Foreign Currency Summary -->
    <div class="grid-2 mb-6 fade-in fade-in-delay-3">
      <div class="card" style="padding:var(--sp-5)">
        <div class="stat-label">🇺🇸 USD Summary</div>
        <div class="stat-value" style="margin:var(--sp-2) 0">${fc(usdSpend, 'usd')}</div>
        <div class="stat-sub">Budget: ${fc(usdBudget, 'usd')}</div>
        <div style="font-size:12px;margin-top:var(--sp-1);color:${usdSpend <= usdBudget ? 'var(--accent-teal)' : 'var(--accent-rose)'}">
          Variance: ${fc(usdBudget - usdSpend, 'usd')}
        </div>
      </div>
      <div class="card" style="padding:var(--sp-5)">
        <div class="stat-label">🇬🇧 GBP Summary</div>
        <div class="stat-value" style="margin:var(--sp-2) 0">${fc(gbpSpend, 'gbp')}</div>
        <div class="stat-sub">Budget: ${fc(gbpBudget, 'gbp')}</div>
        <div style="font-size:12px;margin-top:var(--sp-1);color:${gbpSpend <= gbpBudget ? 'var(--accent-teal)' : 'var(--accent-rose)'}">
          Variance: ${fc(gbpBudget - gbpSpend, 'gbp')}
        </div>
      </div>
    </div>

    <!-- Task Metrics -->
    <div class="card mb-6 fade-in fade-in-delay-4">
      <div class="section-title" style="margin-bottom:var(--sp-5)">📋 Task Metrics</div>

      <div class="grid-3 mb-6">
        <div class="card-sm" style="text-align:center">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-tertiary);margin-bottom:var(--sp-1)">Total</div>
          <div class="font-heading" style="font-size:28px;font-weight:700">${totalTasks}</div>
        </div>
        <div class="card-sm" style="text-align:center">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-tertiary);margin-bottom:var(--sp-1)">Completed</div>
          <div class="font-heading" style="font-size:28px;font-weight:700;color:var(--accent-teal)">${doneTasks}</div>
        </div>
        <div class="card-sm" style="text-align:center">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-tertiary);margin-bottom:var(--sp-1)">Rate</div>
          <div class="font-heading" style="font-size:28px;font-weight:700">${fpc(completionRate)}</div>
        </div>
      </div>

      <div class="progress progress-lg mb-6" style="height:8px">
        <div class="progress-fill" style="width:${completionRate * 100}%;background:var(--accent-teal)"></div>
      </div>

      <div class="grid-2">
        <div>
          <div style="font-weight:600;font-size:14px;margin-bottom:var(--sp-3)">By Role</div>
          ${roleBarHtml}
        </div>
        <div>
          <div style="font-weight:600;font-size:14px;margin-bottom:var(--sp-3)">By Priority</div>
          <div style="display:flex;align-items:center;gap:var(--sp-8);margin-top:var(--sp-4)">
            <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(${conicStops});position:relative;flex-shrink:0">
              <div style="position:absolute;inset:25%;border-radius:50%;background:var(--bg-surface-1);display:grid;place-items:center">
                <span class="font-heading" style="font-size:24px">${priTotal}</span>
                <span style="font-size:11px;color:var(--text-tertiary)">tasks</span>
              </div>
            </div>
            <div>
              ${['High', 'Medium', 'Low'].map(key => `
                <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);font-size:13px">
                  <span style="width:10px;height:10px;border-radius:2px;background:${priColors[key]}"></span>
                  ${key}: ${priCounts[key]}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Financial Health Score -->
    <div class="card fade-in fade-in-delay-4">
      <div class="section-title" style="margin-bottom:var(--sp-5)">💚 Financial Health Score</div>
      <div style="display:flex;align-items:center;gap:var(--sp-8);flex-wrap:wrap">
        <div style="width:160px;height:160px;border-radius:50%;background:conic-gradient(${scoreColor} 0% ${scorePct}%, var(--bg-surface-2) ${scorePct}% 100%);position:relative;flex-shrink:0">
          <div style="position:absolute;inset:20%;border-radius:50%;background:var(--bg-surface-1);display:grid;place-items:center">
            <span class="font-heading" style="font-size:36px;color:${scoreColor}">${Math.round(scorePct)}</span>
            <span style="font-size:12px;color:var(--text-tertiary)">/ 100</span>
          </div>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="display:flex;justify-content:space-between;padding:var(--sp-3) 0;border-bottom:1px solid var(--border-subtle)">
            <span style="font-size:13px">Budget Adherence</span>
            <span class="pill pill-muted" style="font-size:10px">40%</span>
            <span class="font-mono" style="font-size:13px">${fpc(budgetAdherence)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:var(--sp-3) 0;border-bottom:1px solid var(--border-subtle)">
            <span style="font-size:13px">Savings Rate</span>
            <span class="pill pill-muted" style="font-size:10px">30%</span>
            <span class="font-mono" style="font-size:13px">${fpc(savingsRate)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:var(--sp-3) 0">
            <span style="font-size:13px">Task Completion</span>
            <span class="pill pill-muted" style="font-size:10px">30%</span>
            <span class="font-mono" style="font-size:13px">${fpc(taskRate)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// BIND — Read-only page, no interaction needed
// ═══════════════════════════════════════════════════════════════

export function bindAnalytics(container) {
  // Analytics is read-only — no event handlers to bind.
}
