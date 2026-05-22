// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Overview / Dashboard Page
// Landing page with financial snapshot, budget health, savings
// goals, task overview, daily rhythm, and quick actions.
// ═══════════════════════════════════════════════════════════════

import { state, prefs, exps, goals, tasks, wrows, activities, rhythm,
         getMonthSpend, getMonthBudget, catSpend, getBudgetVal } from '../data/store.js';
import { fc, fn, fpc, greet, formatDate, isOverdue, isToday, toUsd,
         getAllMonths, getMonthIndex } from '../lib/utils.js';
import { GHS_CATS, USD_CATS, GBP_CATS, ROLES } from '../data/seedData.js';


// ── HTML Escape Helper ──────────────────────────────────────
// Protects against XSS when embedding user-supplied strings
// into the HTML template.

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


// ═══════════════════════════════════════════════════════════════
// RENDER — Returns the full HTML string for the overview page
// ═══════════════════════════════════════════════════════════════

export function renderOverview() {
  // ── Current state ──
  const SM = state.selectedMonth;
  const mi = getMonthIndex(SM);
  const now = new Date();
  const currentHour = now.getHours();

  // ── Date display ──
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  // ── Exchange rates from prefs ──
  const rates = {
    gbpToUsd: prefs.gbpToUsd || 1.27,
    ghsToUsd: prefs.ghsToUsd || (1 / 16.5),
  };

  // ═════════════════════════════════════════════════════════════
  // 1. FINANCIAL STATS
  // ═════════════════════════════════════════════════════════════

  // GHS Spend vs Budget
  const ghsSpent  = getMonthSpend('ghs', SM);
  const ghsBudget = getMonthBudget('ghs', mi, GHS_CATS);
  const ghsRatio  = ghsBudget > 0 ? ghsSpent / ghsBudget : 0;

  // USD Spend vs Budget
  const usdSpent  = getMonthSpend('usd', SM);
  const usdBudget = getMonthBudget('usd', mi, USD_CATS);
  const usdRatio  = usdBudget > 0 ? usdSpent / usdBudget : 0;

  // Net Worth — calculated from the most recent wealth row with data
  // Falls back to the last row if all are zero
  const latestW = [...wrows].reverse().find(w =>
    (w.usd || 0) + (w.gbp || 0) + (w.ghs || 0) > 0
  ) || wrows[wrows.length - 1] || { usd: 0, gbp: 0, ghs: 0, debts: 0 };

  const netWorth = (latestW.usd || 0)
    + (latestW.gbp || 0) * rates.gbpToUsd
    + (latestW.ghs || 0) * rates.ghsToUsd
    - (latestW.debts || 0);

  // Goals aggregate — convert every goal to USD for a unified %
  const totalSaved  = goals.reduce((s, g) => s + toUsd(g.s || 0, g.curr || 'usd'), 0);
  const totalTarget = goals.reduce((s, g) => s + toUsd(g.t || 0, g.curr || 'usd'), 0);
  const goalsPct    = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  // ── Trend helper (returns CSS color class based on ratio) ──
  function trendColor(ratio) {
    if (ratio >= 1)   return 'var(--accent-rose)';
    if (ratio >= 0.8) return 'var(--accent-gold)';
    return 'var(--accent-teal)';
  }

  // ═════════════════════════════════════════════════════════════
  // 2. BUDGET HEALTH — Top 6 GHS categories by spend
  // ═════════════════════════════════════════════════════════════

  // Build per-category spend + budget, sort by spend descending
  const catData = GHS_CATS.map(cat => {
    const spent  = catSpend('ghs', SM, cat);       // ← FIXED: was using total spend
    const budget = getBudgetVal('ghs', cat, mi);
    return { cat, spent, budget };
  })
    .filter(c => c.spent > 0 || c.budget > 0)      // Only show active categories
    .sort((a, b) => b.spent - a.spent)              // Highest spend first
    .slice(0, 6);                                   // Cap at 6

  // ═════════════════════════════════════════════════════════════
  // 3. SAVINGS GOALS — Top 5
  // ═════════════════════════════════════════════════════════════

  const topGoals = goals.slice(0, 5);

  // Accent colors for goal rings — cycle through the palette
  const goalColors = [
    'var(--accent-blue)',
    'var(--accent-purple)',
    'var(--accent-teal)',
    'var(--accent-gold)',
    'var(--accent-rose)',
  ];

  // ═════════════════════════════════════════════════════════════
  // 4. TASK STATS
  // ═════════════════════════════════════════════════════════════

  const allTasks     = tasks.filter(t => !t.parentId);
  const totalTasks   = allTasks.length;
  const doneTasks    = allTasks.filter(t => t.status === 'Done').length;
  const inProgress   = allTasks.filter(t => t.status === 'In Progress').length;
  const todayStr     = now.toISOString().slice(0, 10);
  const overdueTasks = allTasks.filter(t => t.status !== 'Done' && t.due && t.due < todayStr);
  const overdueCount = overdueTasks.length;

  // Overdue list — show up to 4 most urgent
  const overdueList = overdueTasks
    .sort((a, b) => (a.due || '').localeCompare(b.due || ''))
    .slice(0, 4);

  // ═════════════════════════════════════════════════════════════
  // 5. RHYTHM — Today's schedule with current-hour highlighting
  // ═════════════════════════════════════════════════════════════

  // Parse "9:00 AM" → 24-hour number for highlight comparison
  function parseRhythmHour(timeStr) {
    if (!timeStr) return -1;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return -1;
    let h = parseInt(match[1], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'AM' && h === 12) h = 0;
    if (ampm === 'PM' && h !== 12) h += 12;
    return h;
  }

  // ═════════════════════════════════════════════════════════════
  // BUILD HTML
  // ═════════════════════════════════════════════════════════════

  return `
    <!-- ─── 1. Greeting Hero ─── -->
    <div class="page-header fade-in">
      <h1 class="greeting">${esc(greet(prefs.name))} 👋</h1>
      <p class="date-display" style="margin-top:var(--sp-1)">${dateStr}</p>
    </div>

    <!-- ─── 2. Stat Cards ─── -->
    <div class="grid-4 mb-6 fade-in fade-in-delay-1">

      <!-- GHS Spent -->
      <div class="card stat-card" style="cursor:pointer" data-action="go-expenses-ghs">
        <div class="stat-label">GHS Spent</div>
        <div class="stat-value" style="color:${trendColor(ghsRatio)}">
          ${fc(ghsSpent, 'ghs')}
        </div>
        <div class="stat-sub">
          of ${fc(ghsBudget, 'ghs')} budget
        </div>
        <div class="progress mt-2" style="height:4px">
          <div class="progress-fill" style="width:${Math.min(ghsRatio * 100, 100)}%;background:${trendColor(ghsRatio)}"></div>
        </div>
      </div>

      <!-- USD Spent -->
      <div class="card stat-card" style="cursor:pointer" data-action="go-expenses-usd">
        <div class="stat-label">USD Spent</div>
        <div class="stat-value" style="color:${trendColor(usdRatio)}">
          ${fc(usdSpent, 'usd')}
        </div>
        <div class="stat-sub">
          of ${fc(usdBudget, 'usd')} budget
        </div>
        <div class="progress mt-2" style="height:4px">
          <div class="progress-fill" style="width:${Math.min(usdRatio * 100, 100)}%;background:${trendColor(usdRatio)}"></div>
        </div>
      </div>

      <!-- Net Worth -->
      <div class="card stat-card" style="cursor:pointer" data-action="go-wealth">
        <div class="stat-label">Net Worth</div>
        <div class="stat-value" style="color:var(--accent-teal)">
          ${fc(netWorth, 'usd')}
        </div>
        <div class="stat-sub">
          USD equivalent ${latestW.month ? '· ' + esc(latestW.month) : ''}
        </div>
      </div>

      <!-- Goals Progress -->
      <div class="card stat-card" style="cursor:pointer" data-action="go-wealth">
        <div class="stat-label">Goals Progress</div>
        <div class="stat-value" style="color:var(--accent-gold)">
          ${goalsPct}%
        </div>
        <div class="stat-sub">
          ${fc(totalSaved, 'usd')} saved of ${fc(totalTarget, 'usd')}
        </div>
        <div class="progress mt-2" style="height:4px">
          <div class="progress-fill" style="width:${Math.min(goalsPct, 100)}%;background:var(--accent-gold)"></div>
        </div>
      </div>
    </div>

    <!-- ─── 3. Two-Column: Budget Health + Savings Goals ─── -->
    <div class="grid-2 mb-6 fade-in fade-in-delay-2">

      <!-- Budget Health Card -->
      <div class="card">
        <div class="section-header" style="margin-bottom:var(--sp-4)">
          <div>
            <div class="section-title">💰 Budget Health</div>
            <div class="section-subtitle">${esc(SM)} · GHS categories</div>
          </div>
        </div>

        ${catData.length > 0 ? catData.map(c => {
          const pct   = c.budget > 0 ? Math.min((c.spent / c.budget) * 100, 100) : (c.spent > 0 ? 100 : 0);
          const ratio = c.budget > 0 ? c.spent / c.budget : (c.spent > 0 ? 1.1 : 0);
          const color = ratio >= 1 ? 'var(--accent-rose)' : ratio >= 0.8 ? 'var(--accent-gold)' : 'var(--accent-teal)';

          return `<div style="margin-bottom:var(--sp-3)">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span class="truncate" style="max-width:55%">${esc(c.cat)}</span>
              <span class="font-mono" style="color:var(--text-secondary)">${fc(c.spent, 'ghs')} / ${fc(c.budget, 'ghs')}</span>
            </div>
            <div class="progress"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
          </div>`;
        }).join('') : `
          <div class="empty-state" style="padding:var(--sp-6)">
            <div class="empty-icon">📊</div>
            <div class="empty-desc">No budget data for ${esc(SM)}</div>
          </div>
        `}
      </div>

      <!-- Savings Goals Card -->
      <div class="card">
        <div class="section-header" style="margin-bottom:var(--sp-4)">
          <div>
            <div class="section-title">🎯 Savings Goals</div>
            <div class="section-subtitle">${goals.length} goal${goals.length !== 1 ? 's' : ''} tracked</div>
          </div>
        </div>

        ${topGoals.length > 0 ? topGoals.map((g, i) => {
          const saved  = g.s || 0;
          const target = g.t || 1;
          const pct    = Math.min((saved / target) * 100, 100);
          const color  = goalColors[i % goalColors.length];
          // SVG donut ring — circumference of r=18 is ≈ 113.1
          const dash   = (pct * 113.1) / 100;

          return `<div style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-4)">
            <svg width="44" height="44" viewBox="0 0 44 44" style="flex-shrink:0">
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--bg-surface-3)" stroke-width="3.5"/>
              <circle cx="22" cy="22" r="18" fill="none" stroke="${color}" stroke-width="3.5"
                stroke-dasharray="${dash} 113.1" stroke-linecap="round" transform="rotate(-90 22 22)"
                style="transition:stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)"/>
            </svg>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:14px" class="truncate">${esc(g.n)}</div>
              <div class="text-secondary" style="font-size:12px">
                ${fc(saved, g.curr || 'usd')} / ${fc(target, g.curr || 'usd')} · ${(g.curr || 'usd').toUpperCase()}
              </div>
            </div>
            <span class="pill ${pct >= 100 ? 'pill-teal' : pct >= 50 ? 'pill-blue' : 'pill-muted'}" style="flex-shrink:0">
              ${Math.round(pct)}%
            </span>
          </div>`;
        }).join('') : `
          <div class="empty-state" style="padding:var(--sp-6)">
            <div class="empty-icon">🎯</div>
            <div class="empty-desc">No savings goals yet</div>
          </div>
        `}
      </div>
    </div>

    <!-- ─── 4. Tasks Section (3-column) ─── -->
    <div class="grid-3 mb-6 fade-in fade-in-delay-3">

      <!-- Task Summary -->
      <div class="card">
        <div class="section-title" style="margin-bottom:var(--sp-4)">📋 Tasks</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
          <div class="card-sm" style="text-align:center">
            <div class="text-tertiary" style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--sp-1)">Total</div>
            <div class="font-heading" style="font-size:24px;font-weight:700">${totalTasks}</div>
          </div>
          <div class="card-sm" style="text-align:center">
            <div class="text-tertiary" style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--sp-1)">Done</div>
            <div class="font-heading" style="font-size:24px;font-weight:700;color:var(--accent-teal)">${doneTasks}</div>
          </div>
          <div class="card-sm" style="text-align:center">
            <div class="text-tertiary" style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--sp-1)">In Progress</div>
            <div class="font-heading" style="font-size:24px;font-weight:700;color:var(--accent-blue)">${inProgress}</div>
          </div>
          <div class="card-sm" style="text-align:center">
            <div class="text-tertiary" style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--sp-1)">Overdue</div>
            <div class="font-heading" style="font-size:24px;font-weight:700;color:${overdueCount > 0 ? 'var(--accent-rose)' : 'var(--accent-teal)'}">${overdueCount}</div>
          </div>
        </div>
        ${totalTasks > 0 ? `
          <div class="progress mt-3" style="height:6px">
            <div class="progress-fill" style="width:${totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%;background:var(--accent-teal)"></div>
          </div>
          <div class="text-tertiary mt-1" style="font-size:11px;text-align:right">
            ${totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}% complete
          </div>
        ` : ''}
      </div>

      <!-- Overdue Tasks -->
      <div class="card">
        <div class="section-title" style="margin-bottom:var(--sp-4)">
          🚨 Overdue
          ${overdueCount > 0 ? `<span class="pill pill-rose" style="margin-left:var(--sp-2);vertical-align:middle">${overdueCount}</span>` : ''}
        </div>

        ${overdueList.length > 0 ? overdueList.map(t => {
          const role = ROLES.find(r => r.id === t.role);
          return `<div style="display:flex;align-items:flex-start;gap:var(--sp-3);margin-bottom:var(--sp-3);padding:var(--sp-2) var(--sp-3);background:var(--bg-surface-2);border-radius:var(--radius-sm)">
            <span style="font-size:14px;margin-top:1px">${role ? role.emoji : '📌'}</span>
            <div style="flex:1;min-width:0">
              <div class="truncate" style="font-size:13px;font-weight:500">${esc(t.title)}</div>
              <div style="font-size:11px;color:var(--accent-rose);font-weight:600;margin-top:2px">
                Due ${formatDate(t.due)}
              </div>
            </div>
          </div>`;
        }).join('') : `
          <div style="text-align:center;padding:var(--sp-6) 0;color:var(--text-tertiary)">
            <div style="font-size:32px;margin-bottom:var(--sp-2)">✅</div>
            <div style="font-size:13px">All caught up!</div>
          </div>
        `}
      </div>

      <!-- Today's Rhythm -->
      <div class="card">
        <div class="section-title" style="margin-bottom:var(--sp-4)">⏰ Daily Rhythm</div>

        <div style="max-height:280px;overflow-y:auto;padding-right:var(--sp-1)">
          ${rhythm.length > 0 ? rhythm.map(entry => {
            const time = Array.isArray(entry) ? entry[0] : '';
            const act  = Array.isArray(entry) ? entry[1] : '';
            const entryHour = parseRhythmHour(time);

            // Highlight if this is the current hour's block
            const isCurrent = entryHour === currentHour;
            const bgStyle   = isCurrent
              ? 'background:var(--accent-blue-glow);border-left:3px solid var(--accent-blue);padding-left:var(--sp-3)'
              : 'border-left:3px solid transparent;padding-left:var(--sp-3)';

            return `<div style="display:flex;align-items:flex-start;gap:var(--sp-3);margin-bottom:var(--sp-2);padding:var(--sp-2);border-radius:var(--radius-sm);${bgStyle};transition:background 200ms">
              <span class="font-mono" style="font-size:11px;color:${isCurrent ? 'var(--accent-blue)' : 'var(--text-tertiary)'};min-width:60px;flex-shrink:0;font-weight:${isCurrent ? '700' : '500'}">${esc(time)}</span>
              <span style="font-size:12px;color:${isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)'};line-height:1.4">${esc(act)}</span>
            </div>`;
          }).join('') : `
            <div style="text-align:center;padding:var(--sp-6) 0;color:var(--text-tertiary)">
              <div style="font-size:13px">No rhythm set</div>
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- ─── 5. Quick Actions ─── -->
    <div class="grid-4 fade-in fade-in-delay-4">
      <div class="card-sm" style="cursor:pointer;text-align:center" data-action="add-expense">
        <div style="font-size:24px;margin-bottom:var(--sp-2)">💳</div>
        <div style="font-size:13px;font-weight:600;color:var(--accent-blue)">+ Add Expense</div>
      </div>
      <div class="card-sm" style="cursor:pointer;text-align:center" data-action="add-task">
        <div style="font-size:24px;margin-bottom:var(--sp-2)">✅</div>
        <div style="font-size:13px;font-weight:600;color:var(--accent-purple)">+ New Task</div>
      </div>
      <div class="card-sm" style="cursor:pointer;text-align:center" data-action="go-budget">
        <div style="font-size:24px;margin-bottom:var(--sp-2)">📋</div>
        <div style="font-size:13px;font-weight:600;color:var(--accent-teal)">View Budget</div>
      </div>
      <div class="card-sm" style="cursor:pointer;text-align:center" data-action="go-calendar">
        <div style="font-size:24px;margin-bottom:var(--sp-2)">📅</div>
        <div style="font-size:13px;font-weight:600;color:var(--accent-gold)">View Calendar</div>
      </div>
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════
// BIND — Attach event delegation after the page is rendered
// ═══════════════════════════════════════════════════════════════

export function bindOverview(container) {
  container.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;

    switch (action) {
      case 'go-budget':
        import('../app.js').then(app => app.navigate('budget'));
        break;
      case 'go-calendar':
        import('../app.js').then(app => app.navigate('calendar'));
        break;
      case 'go-wealth':
        import('../app.js').then(app => app.navigate('wealth'));
        break;
      case 'go-expenses-ghs':
        state.expCurr = 'ghs';
        import('../app.js').then(app => app.navigate('expenses'));
        break;
      case 'go-expenses-usd':
        state.expCurr = 'usd';
        import('../app.js').then(app => app.navigate('expenses'));
        break;
      case 'add-expense':
        import('../app.js').then(app => {
          app.navigate('expenses');
          setTimeout(() => document.dispatchEvent(new CustomEvent('topbar-action', { detail: { action } })), 50);
        });
        break;
      case 'add-task':
        import('../app.js').then(app => {
          app.navigate('tasks');
          setTimeout(() => document.dispatchEvent(new CustomEvent('topbar-action', { detail: { action } })), 50);
        });
        break;
    }
  });
}
