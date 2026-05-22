// ═══════════════════════════════════════════════════════════════
// Budget — Multi-currency budget management with inline editing
// 7-tab segmented control: GHS/USD/GBP Monthly & Annual + Pay Schedule
// All editing is done inline — no prompt() dialogs.
// ═══════════════════════════════════════════════════════════════

import { state, ghsBudgets, usdBudgets, gbpBudgets, exps,
         getBudgetVal, setBudgetVal, getMonthBudget, catSpend, getMonthSpend,
         getPayChecks, setPayCheck } from '../data/store.js';
import { fc, fn, getAllMonths, getMonthIndex, getMonthName } from '../lib/utils.js';
import { GHS_CATS, GHS_INC_CATS, USD_CATS, USD_INC_CATS, GBP_CATS, GBP_INC_CATS,
         PAY_SCHEDULE } from '../data/seedData.js';


// ── Constants ──────────────────────────────────────────────
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Tab configuration — id, label pairs for the segmented control */
const TABS = [
  { id: 'ghs_monthly', label: 'GHS Monthly' },
  { id: 'ghs_annual',  label: 'GHS Annual'  },
  { id: 'usd_monthly', label: 'USD Monthly' },
  { id: 'usd_annual',  label: 'USD Annual'  },
  { id: 'gbp_monthly', label: 'GBP Monthly' },
  { id: 'gbp_annual',  label: 'GBP Annual'  },
  { id: 'pay',         label: 'Pay Schedule' },
];


// ── Helpers ────────────────────────────────────────────────

/** Escape HTML to prevent XSS from user-entered data */
function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Get the current month index (0-11) from the selected month key */
function currentMi() {
  return getMonthIndex(state.selectedMonth);
}

/** All expense categories for a currency */
function expCats(curr) {
  if (curr === 'ghs') return GHS_CATS;
  if (curr === 'usd') return USD_CATS;
  return GBP_CATS;
}

/** All income categories for a currency */
function incCats(curr) {
  if (curr === 'ghs') return GHS_INC_CATS;
  if (curr === 'usd') return USD_INC_CATS;
  return GBP_INC_CATS;
}

/** Currency symbol for display */
function sym(curr) {
  if (curr === 'ghs') return 'GH₵';
  if (curr === 'usd') return '$';
  return '£';
}


// ═══════════════════════════════════════════════════════════════
// RENDER — returns the full page HTML string
// ═══════════════════════════════════════════════════════════════

export function renderBudget() {
  const tab = state.budTab || 'ghs_monthly';

  return `
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title">Budget</div>
      <div class="page-subtitle">Plan and track your spending across currencies</div>
    </div>

    <!-- Segmented Control -->
    <div class="seg-control mb-6" style="flex-wrap:wrap">
      ${TABS.map(t => `
        <button class="seg-btn ${tab === t.id ? 'active' : ''}"
                data-action="switch-budget-tab" data-tab="${t.id}">
          ${t.label}
        </button>
      `).join('')}
    </div>

    <!-- Tab Content -->
    <div id="budget-content">
      ${renderTabContent(tab)}
    </div>
  `;
}


// ── Tab Router ─────────────────────────────────────────────

function renderTabContent(tab) {
  switch (tab) {
    case 'ghs_monthly': return renderMonthly('ghs');
    case 'ghs_annual':  return renderAnnual('ghs');
    case 'usd_monthly': return renderMonthly('usd');
    case 'usd_annual':  return renderAnnual('usd');
    case 'gbp_monthly': return renderMonthly('gbp');
    case 'gbp_annual':  return renderAnnual('gbp');
    case 'pay':         return renderPaySchedule();
    default:            return renderMonthly('ghs');
  }
}


// ═══════════════════════════════════════════════════════════════
// MONTHLY VIEW — stat cards + budget vs spent table
// For GHS: expense-only view with Budget Total / Spent / Remaining
// For USD / GBP: Income + Expense sections with Surplus/Deficit
// ═══════════════════════════════════════════════════════════════

function renderMonthly(curr) {
  const mi = currentMi();
  const SM = state.selectedMonth;
  const s = sym(curr);
  const eCats = expCats(curr);
  const iCats = incCats(curr);

  // ── Compute totals ──
  const totalExpBudget = eCats.reduce((sum, cat) => sum + getBudgetVal(curr, cat, mi), 0);
  const totalExpSpent  = eCats.reduce((sum, cat) => sum + catSpend(curr, SM, cat), 0);
  const totalIncBudget = iCats.reduce((sum, cat) => sum + getBudgetVal(curr, cat, mi), 0);
  const totalIncActual = iCats.reduce((sum, cat) => sum + catSpend(curr, SM, cat), 0);
  const remaining = totalExpBudget - totalExpSpent;
  const surplus = totalIncBudget - totalExpBudget;

  // ── Income section (USD/GBP get full income+expense+surplus) ──
  const showIncome = curr === 'usd' || curr === 'gbp';

  // ── Stat cards ──
  let statsHtml;
  if (showIncome) {
    statsHtml = `
      <div class="grid-3 mb-6 fade-in">
        <div class="card stat-card">
          <div class="stat-label">Monthly Income</div>
          <div class="stat-value" style="color:var(--accent-teal)">${s}${fn(totalIncBudget)}</div>
          <div class="stat-sub">Budget</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Monthly Expenses</div>
          <div class="stat-value" style="color:var(--accent-rose)">${s}${fn(totalExpBudget)}</div>
          <div class="stat-sub">Budget</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">${surplus >= 0 ? 'Surplus' : 'Deficit'}</div>
          <div class="stat-value" style="color:${surplus >= 0 ? 'var(--accent-teal)' : 'var(--accent-rose)'}">${s}${fn(Math.abs(surplus))}</div>
          <div class="stat-sub">${SM}</div>
        </div>
      </div>
    `;
  } else {
    statsHtml = `
      <div class="grid-3 mb-6 fade-in">
        <div class="card stat-card">
          <div class="stat-label">Budget Total</div>
          <div class="stat-value">${s}${fn(totalExpBudget)}</div>
          <div class="stat-sub">${SM}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Spent</div>
          <div class="stat-value" style="color:var(--accent-rose)">${s}${fn(totalExpSpent)}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">${remaining >= 0 ? 'Remaining' : 'Overspent'}</div>
          <div class="stat-value" style="color:${remaining >= 0 ? 'var(--accent-teal)' : 'var(--accent-rose)'}">${s}${fn(Math.abs(remaining))}</div>
        </div>
      </div>
    `;
  }

  // ── Build the budget table for a set of categories ──
  const buildTable = (title, cats, color) => {
    const totalBud = cats.reduce((sum, cat) => sum + getBudgetVal(curr, cat, mi), 0);
    const totalSp  = cats.reduce((sum, cat) => sum + catSpend(curr, SM, cat), 0);
    const totalRem = totalBud - totalSp;

    return `
      <div class="card mb-4 fade-in">
        <div class="section-header">
          <div class="section-title" style="color:${color}">${esc(title)}</div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th style="text-align:right">Budget</th>
                <th style="text-align:right">Spent</th>
                <th style="text-align:right">Remaining</th>
                <th style="text-align:center">Status</th>
                <th style="width:100px">Progress</th>
              </tr>
            </thead>
            <tbody>
              ${cats.map(cat => {
                const bud = getBudgetVal(curr, cat, mi);
                const sp  = catSpend(curr, SM, cat);
                const rem = bud - sp;
                const over = sp > bud && bud > 0;
                const pct = bud > 0 ? Math.min((sp / bud) * 100, 100) : (sp > 0 ? 100 : 0);
                const barColor = over ? 'var(--accent-rose)' : pct >= 80 ? 'var(--accent-gold)' : 'var(--accent-teal)';
                const status = sp === 0 && bud === 0
                  ? '<span class="pill pill-muted">—</span>'
                  : over
                    ? '<span class="pill pill-rose">Over</span>'
                    : pct >= 80
                      ? '<span class="pill pill-gold">Alert</span>'
                      : '<span class="pill pill-teal">On Track</span>';

                return `<tr>
                  <td>${esc(cat)}</td>
                  <td style="text-align:right">
                    <span class="inline-edit" data-action="edit-budget"
                          data-curr="${curr}" data-cat="${esc(cat)}" data-month="${mi}"
                          tabindex="0">
                      ${fn(bud)}
                    </span>
                  </td>
                  <td style="text-align:right;color:${sp > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)'}">${sp > 0 ? s + fn(sp) : '0'}</td>
                  <td style="text-align:right;color:${rem >= 0 ? 'var(--accent-teal)' : 'var(--accent-rose)'}">${rem >= 0 ? '' : '-'}${s}${fn(Math.abs(rem))}</td>
                  <td style="text-align:center">${status}</td>
                  <td style="width:100px">
                    <div class="progress" style="height:4px"><div class="progress-fill" style="width:${pct}%;background:${barColor}"></div></div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--bg-surface-2);font-weight:600">
                <td>Total</td>
                <td style="text-align:right">${s}${fn(totalBud)}</td>
                <td style="text-align:right">${s}${fn(totalSp)}</td>
                <td style="text-align:right;color:${totalRem >= 0 ? 'var(--accent-teal)' : 'var(--accent-rose)'}">
                  ${totalRem >= 0 ? '' : '-'}${s}${fn(Math.abs(totalRem))}
                </td>
                <td></td>
                <td>
                  <div class="progress" style="height:4px"><div class="progress-fill" style="width:${totalBud > 0 ? Math.min((totalSp / totalBud) * 100, 100) : 0}%;background:${totalSp > totalBud ? 'var(--accent-rose)' : 'var(--accent-teal)'}"></div></div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  };

  // ── Assemble ──
  let html = statsHtml;

  if (showIncome) {
    html += buildTable(`${curr.toUpperCase()} Income — ${SM}`, iCats, 'var(--accent-teal)');
  }

  html += buildTable(
    showIncome ? `${curr.toUpperCase()} Expenses — ${SM}` : `GHS Expenses — ${SM}`,
    eCats,
    'var(--accent-rose)'
  );

  return html;
}


// ═══════════════════════════════════════════════════════════════
// ANNUAL VIEW — 12-month scrollable grid with sticky first column
// Each cell is click-to-edit (inline). Cells with 0 are dimmed.
// ═══════════════════════════════════════════════════════════════

function renderAnnual(curr) {
  const s = sym(curr);
  const eCats = expCats(curr);
  const iCats = incCats(curr);
  const allCats = [...iCats, ...eCats];
  const year = new Date().getFullYear();

  // For distinguishing income vs expense rows visually
  const incomeSet = new Set(iCats);

  const buildAnnualTable = (title, cats, color) => {
    // Totals row data
    const monthTotals = new Array(12).fill(0);
    let grandTotal = 0;

    const rows = cats.map(cat => {
      let rowTotal = 0;
      const cells = [];
      for (let mi = 0; mi < 12; mi++) {
        const val = getBudgetVal(curr, cat, mi);
        rowTotal += val;
        monthTotals[mi] += val;
        cells.push(val);
      }
      grandTotal += rowTotal;
      return { cat, cells, rowTotal };
    });

    return `
      <div class="card mb-4 fade-in">
        <div class="section-header">
          <div class="section-title" style="color:${color}">${esc(title)} — ${year}</div>
        </div>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
          <table class="data-table" style="min-width:1200px">
            <thead>
              <tr>
                <th style="position:sticky;left:0;z-index:2;background:var(--bg-surface-2);min-width:180px">Category</th>
                ${MONTH_ABBR.map(m => `<th style="text-align:right;min-width:80px">${m}</th>`).join('')}
                <th style="text-align:right;min-width:90px">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td style="position:sticky;left:0;z-index:1;background:var(--bg-surface-1);font-size:12px;white-space:nowrap">${esc(r.cat)}</td>
                  ${r.cells.map((val, mi) => `
                    <td style="text-align:right${val === 0 ? ';opacity:0.3' : ''}">
                      <span class="inline-edit" data-action="edit-budget"
                            data-curr="${curr}" data-cat="${esc(r.cat)}" data-month="${mi}"
                            tabindex="0">
                        ${fn(val)}
                      </span>
                    </td>
                  `).join('')}
                  <td style="text-align:right;font-weight:600;color:var(--text-primary)">${s}${fn(r.rowTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--bg-surface-2);font-weight:600">
                <td style="position:sticky;left:0;z-index:1;background:var(--bg-surface-2)">Total</td>
                ${monthTotals.map(t => `<td style="text-align:right">${s}${fn(t)}</td>`).join('')}
                <td style="text-align:right;color:${color}">${s}${fn(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  };

  let html = '';

  // Show income section for USD/GBP, or income categories for GHS if they exist
  if (iCats.length > 0) {
    html += buildAnnualTable(`${curr.toUpperCase()} Income`, iCats, 'var(--accent-teal)');
  }

  html += buildAnnualTable(`${curr.toUpperCase()} Expenses`, eCats, 'var(--accent-rose)');

  return html;
}


// ═══════════════════════════════════════════════════════════════
// PAY SCHEDULE — monthly checklist of bills and payments
// ═══════════════════════════════════════════════════════════════

function renderPaySchedule() {
  const SM = state.selectedMonth;
  const checks = getPayChecks(SM);
  const doneCount = Object.values(checks).filter(Boolean).length;
  const total = PAY_SCHEDULE.length;

  return `
    <div class="card fade-in">
      <!-- Header with summary -->
      <div class="section-header">
        <div>
          <div class="section-title">Monthly Payment Schedule</div>
          <div class="section-subtitle">${SM}</div>
        </div>
        <div>
          <span class="pill ${doneCount === total ? 'pill-teal' : 'pill-gold'}">
            ${doneCount} of ${total} paid
          </span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="progress mb-4" style="height:8px">
        <div class="progress-fill" style="width:${total > 0 ? (doneCount / total) * 100 : 0}%;background:var(--accent-teal)"></div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px;text-align:center">#</th>
              <th>Item</th>
              <th style="text-align:right">Amount</th>
              <th>Day</th>
              <th style="text-align:center;width:60px">Status</th>
            </tr>
          </thead>
          <tbody>
            ${PAY_SCHEDULE.map((row, i) => {
              const done = !!checks[i];
              return `
                <tr style="${done ? 'opacity:0.45' : ''}">
                  <td style="text-align:center;color:var(--text-tertiary)">${i + 1}</td>
                  <td style="${done ? 'text-decoration:line-through' : ''}">${esc(row[1])}</td>
                  <td style="text-align:right;font-weight:500">${esc(row[2])}</td>
                  <td style="color:var(--accent-gold);font-weight:500;white-space:nowrap">${esc(row[0])}</td>
                  <td style="text-align:center">
                    <label class="checkbox-wrap" style="justify-content:center">
                      <input type="checkbox" ${done ? 'checked' : ''}
                             data-action="toggle-paycheck" data-idx="${i}">
                    </label>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Footer note -->
      <div style="margin-top:var(--sp-4);padding-top:var(--sp-3);border-top:1px solid var(--border-subtle)">
        <p style="font-size:12px;color:var(--text-tertiary);font-style:italic">
          ${doneCount === total
            ? '🎉 All payments complete for this month!'
            : `${total - doneCount} payment${total - doneCount === 1 ? '' : 's'} remaining. Stay on track!`}
        </p>
      </div>
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════
// BIND — Attach event listeners via delegation on the container
// ═══════════════════════════════════════════════════════════════

export function bindBudget(container) {
  // Using event delegation: listen on the container for all
  // data-action events rather than attaching to each element.

  container.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    // ── Tab Switching ──
    if (action === 'switch-budget-tab') {
      state.budTab = target.dataset.tab;
      rerender(container);
      return;
    }

    // ── Inline Edit — activate input on click ──
    if (action === 'edit-budget') {
      activateInlineEdit(target, container);
      return;
    }
  });

  // ── Checkbox toggles for pay schedule ──
  container.addEventListener('change', (e) => {
    const target = e.target.closest('[data-action="toggle-paycheck"]');
    if (!target) return;

    const idx = parseInt(target.dataset.idx, 10);
    const checked = target.checked;
    setPayCheck(state.selectedMonth, idx, checked);
    rerender(container);
  });

  // ── Keyboard support: Enter activates inline edit ──
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const target = e.target.closest('[data-action="edit-budget"]');
      if (target && target.tagName !== 'INPUT') {
        e.preventDefault();
        activateInlineEdit(target, container);
      }
    }
  });
}


// ═══════════════════════════════════════════════════════════════
// INLINE EDITING — Replace a span with an input field
// ═══════════════════════════════════════════════════════════════

/**
 * Transform a .inline-edit span into a text input for editing.
 * On Enter → save the new value via setBudgetVal() and re-render.
 * On Escape → cancel and restore the original display.
 */
function activateInlineEdit(span, container) {
  // Guard: don't double-activate
  if (span._editing) return;
  span._editing = true;

  const curr  = span.dataset.curr;
  const cat   = span.dataset.cat;
  const mi    = parseInt(span.dataset.month, 10);
  const currentVal = getBudgetVal(curr, cat, mi);

  // Create the input element
  const input = document.createElement('input');
  input.type = 'number';
  input.value = currentVal;
  input.step = '0.01';
  input.style.cssText = `
    width: 80px;
    background: var(--bg-surface-2);
    border: 1px solid var(--accent-blue);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    padding: 2px 6px;
    text-align: right;
    outline: none;
    box-shadow: 0 0 0 3px hsla(225, 92%, 65%, 0.15);
  `;

  // Store original text content for cancel
  const originalText = span.textContent;

  // Replace span content with input
  span.textContent = '';
  span.appendChild(input);
  input.focus();
  input.select();

  // ── Save Handler ──
  const save = () => {
    const newVal = parseFloat(input.value) || 0;
    setBudgetVal(curr, cat, mi, newVal);
    rerender(container);
  };

  // ── Cancel Handler ──
  const cancel = () => {
    span.textContent = originalText;
    span._editing = false;
  };

  // ── Keyboard Events ──
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
    // Stop propagation so the container's keydown handler doesn't re-trigger
    e.stopPropagation();
  });

  // ── Blur: save on focus loss (same as Enter) ──
  input.addEventListener('blur', () => {
    // Small delay to allow Escape to fire first
    setTimeout(() => {
      if (span._editing) save();
    }, 100);
  });
}


// ═══════════════════════════════════════════════════════════════
// RE-RENDER — Update the page content in-place
// ═══════════════════════════════════════════════════════════════

/**
 * Re-render just the budget page content inside the container.
 * Then re-bind events since the DOM was replaced.
 */
function rerender(container) {
  container.innerHTML = renderBudget();
  bindBudget(container);
}
