// ═══════════════════════════════════════════════════════════════
// Wealth — Net worth tracker, savings goals with SVG progress
// rings, wealth log, and full CRUD modals.
// ═══════════════════════════════════════════════════════════════

import { state, wrows, goals, saveWrows, saveGoals, prefs } from '../data/store.js';
import { fc, fn, fpc, toUsd, getExchangeRates, generateId, getAllMonths, getMonthIndex } from '../lib/utils.js';
import { MKEYS } from '../data/seedData.js';
import { openModal, closeModal, toast } from '../app.js';

let _topbarHandler = null;

// ── Helpers ────────────────────────────────────────────────

/** Escape HTML for safe insertion of user data */
function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Currency symbol from code */
function sym(curr) {
  if (curr === 'ghs') return 'GH₵';
  if (curr === 'gbp') return '£';
  return '$';
}

/** Currency badge color class */
function currBadge(curr) {
  if (curr === 'ghs') return 'pill-gold';
  if (curr === 'gbp') return 'pill-purple';
  return 'pill-teal';
}

/** Convert any goal amount to USD for totals */
function goalToUsd(amount, curr) {
  return toUsd(amount, curr);
}

/**
 * Generate SVG circle progress ring.
 * Circumference = 2 * PI * 20 = 125.66…
 * @param {number} pct — percentage (0–100)
 * @param {string} color — stroke color CSS variable
 */
function progressRing(pct, color) {
  const circumference = 125.6; // 2 * Math.PI * 20
  const dashLen = (Math.min(pct, 100) * circumference) / 100;
  return `
    <svg width="48" height="48" viewBox="0 0 48 48" style="flex-shrink:0">
      <circle cx="24" cy="24" r="20" fill="none"
              stroke="var(--bg-surface-3)" stroke-width="4"/>
      <circle cx="24" cy="24" r="20" fill="none"
              stroke="${color}" stroke-width="4"
              stroke-dasharray="${dashLen} ${circumference}"
              stroke-linecap="round"
              transform="rotate(-90 24 24)"
              style="transition:stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1)"/>
    </svg>
  `;
}


// ═══════════════════════════════════════════════════════════════
// RENDER — Full page HTML
// ═══════════════════════════════════════════════════════════════

export function renderWealth() {
  const rates = getExchangeRates();

  // ── Compute Net Worth from latest wrow ──
  // We take the latest (most recent) entry with actual data
  const latestRow = [...wrows].reverse().find(r =>
    r.usd !== 0 || r.gbp !== 0 || r.ghs !== 0 || r.debts !== 0
  ) || wrows[wrows.length - 1] || { usd: 0, gbp: 0, ghs: 0, debts: 0 };

  const netWorth = latestRow.usd
    + (latestRow.gbp * rates.gbpToUsd)
    + (latestRow.ghs * rates.ghsToUsd)
    - latestRow.debts;

  // ── Goals aggregation (everything converted to USD) ──
  const totalSaved = goals.reduce((s, g) => s + goalToUsd(g.s, g.curr), 0);
  const totalTarget = goals.reduce((s, g) => s + goalToUsd(g.t, g.curr), 0);
  const amountNeeded = Math.max(0, totalTarget - totalSaved);

  return `
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-title">Wealth</div>
      <div class="page-subtitle">Net worth, investments & savings goals</div>
    </div>

    <!-- 3 Stat Cards -->
    <div class="grid-3 mb-6 fade-in">
      <div class="card stat-card">
        <div class="stat-label">Net Worth (USD)</div>
        <div class="stat-value" style="color:var(--accent-teal)">~$${fn(Math.round(netWorth))}</div>
        <div class="stat-sub">Latest snapshot</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Total Saved</div>
        <div class="stat-value" style="color:var(--accent-gold)">$${fn(Math.round(totalSaved))}</div>
        <div class="stat-sub">Across ${goals.length} goal${goals.length !== 1 ? 's' : ''} (USD equiv.)</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Amount Needed</div>
        <div class="stat-value" style="color:var(--accent-rose)">$${fn(Math.round(amountNeeded))}</div>
        <div class="stat-sub">${totalTarget > 0 ? fpc(totalSaved / totalTarget) : '0%'} complete</div>
      </div>
    </div>

    <!-- Two-column grid: Goals + Wealth Log -->
    <div class="grid-2 gap-4 fade-in fade-in-delay-1">
      <!-- ═══ LEFT: Savings Goals ═══ -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">🎯 Savings Goals</div>
          <button class="btn btn-primary btn-sm" data-action="add-goal">+ Add Goal</button>
        </div>

        ${goals.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🎯</div>
            <div class="empty-title">No goals yet</div>
            <div class="empty-desc">Create a savings goal to start tracking your progress.</div>
          </div>
        ` : goals.map((g, i) => {
          const pct = g.t > 0 ? (g.s / g.t) * 100 : 0;
          const clampedPct = Math.min(100, pct);
          const s = sym(g.curr);
          // Status indicator
          const statusEmoji = pct < 50 ? '🔴' : pct < 80 ? '🟡' : '🟢';
          const ringColor = pct < 50
            ? 'var(--accent-rose)'
            : pct < 80
              ? 'var(--accent-gold)'
              : 'var(--accent-teal)';

          return `
            <div style="display:flex;align-items:center;gap:var(--sp-4);padding:var(--sp-3) 0;border-bottom:1px solid var(--border-subtle)">
              <!-- SVG Progress Ring -->
              <div style="position:relative;flex-shrink:0">
                ${progressRing(clampedPct, ringColor)}
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-primary)">
                  ${Math.round(clampedPct)}%
                </div>
              </div>

              <!-- Goal Info -->
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:2px">
                  <span style="font-size:14px;font-weight:600;color:var(--text-primary)">${statusEmoji} ${esc(g.n)}</span>
                  <span class="pill ${currBadge(g.curr)}" style="font-size:10px">${g.curr.toUpperCase()}</span>
                </div>
                <div style="font-size:12px;color:var(--text-secondary)">
                  ${s}${fn(Math.round(g.s))} / ${s}${fn(Math.round(g.t))}
                </div>
                ${g.notes ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:2px">${esc(g.notes)}</div>` : ''}
                ${g.d ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:2px">📅 ${esc(g.d)}</div>` : ''}
              </div>

              <!-- Actions -->
              <div style="display:flex;gap:var(--sp-1);flex-shrink:0">
                <button class="btn btn-ghost btn-sm" data-action="edit-goal" data-idx="${i}">Edit</button>
                <button class="btn btn-danger btn-sm" data-action="delete-goal" data-idx="${i}">Del</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- ═══ RIGHT: Net Worth Log ═══ -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">📈 Net Worth Log</div>
          <button class="btn btn-primary btn-sm" data-action="add-wealth">+ Add Entry</button>
        </div>

        ${wrows.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <div class="empty-title">No entries</div>
            <div class="empty-desc">Add your first monthly wealth snapshot.</div>
          </div>
        ` : `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style="text-align:right">USD</th>
                  <th style="text-align:right">GBP</th>
                  <th style="text-align:right">GHS</th>
                  <th style="text-align:right">Debts</th>
                  <th style="text-align:right">Net Worth</th>
                  <th style="width:60px"></th>
                </tr>
              </thead>
              <tbody>
                ${wrows.map((r, i) => {
                  const nw = r.usd
                    + (r.gbp * rates.gbpToUsd)
                    + (r.ghs * rates.ghsToUsd)
                    - r.debts;
                  const isEmpty = r.usd === 0 && r.gbp === 0 && r.ghs === 0 && r.debts === 0;

                  return `
                    <tr style="${isEmpty ? 'opacity:0.4' : ''}">
                      <td style="font-weight:500;white-space:nowrap">${esc(r.month)}</td>
                      <td class="col-amount">${r.usd !== 0 ? '$' + fn(Math.round(r.usd)) : '—'}</td>
                      <td class="col-amount">${r.gbp !== 0 ? '£' + fn(Math.round(r.gbp)) : '—'}</td>
                      <td class="col-amount">${r.ghs !== 0 ? 'GH₵' + fn(Math.round(r.ghs)) : '—'}</td>
                      <td class="col-amount" style="color:${r.debts > 0 ? 'var(--accent-rose)' : ''}">${r.debts !== 0 ? '$' + fn(Math.round(r.debts)) : '—'}</td>
                      <td class="col-amount" style="font-weight:600;color:${nw >= 0 ? 'var(--accent-teal)' : 'var(--accent-rose)'}">
                        ${isEmpty ? '—' : '~$' + fn(Math.round(nw))}
                      </td>
                      <td class="col-actions">
                        <button class="btn btn-ghost btn-sm" data-action="edit-wealth" data-idx="${i}">Edit</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════
// BIND — Attach event listeners via delegation
// ═══════════════════════════════════════════════════════════════

export function bindWealth(container) {
  container.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      // ── Goal CRUD ──
      case 'add-goal':
        openGoalModal();
        break;

      case 'edit-goal':
        openGoalModal(parseInt(target.dataset.idx, 10));
        break;

      case 'delete-goal': {
        const idx = parseInt(target.dataset.idx, 10);
        const goal = goals[idx];
        if (!goal) return;
        openModal(`
          <div style="margin-bottom:var(--sp-4)"><div class="section-title">🗑️ Delete Goal</div></div>
          <p class="text-secondary" style="margin-bottom:var(--sp-4)">Delete goal "${esc(goal.n)}"?</p>
          <div style="display:flex;gap:var(--sp-3);justify-content:flex-end">
            <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
            <button class="btn btn-danger" id="confirm-del-goal">🗑️ Delete</button>
          </div>
        `);
        document.getElementById('confirm-del-goal')?.addEventListener('click', () => {
          goals.splice(idx, 1);
          saveGoals();
          closeModal();
          toast('✓ Goal deleted', 'success');
          import('../app.js').then(a => a.renderPage());
        });
        break;
      }

      case 'save-goal':
        handleSaveGoal(container);
        break;

      // ── Wealth CRUD ──
      case 'add-wealth':
        openWealthModal();
        break;

      case 'edit-wealth':
        openWealthModal(parseInt(target.dataset.idx, 10));
        break;

      case 'save-wealth':
        handleSaveWealth(container);
        break;

      // ── Cancel / Close ──
      case 'close-modal':
        closeModal();
        break;

      default:
        break;
    }
  });

  // ── Topbar "+" button handler ──
  if (_topbarHandler) document.removeEventListener('topbar-action', _topbarHandler);
  _topbarHandler = (e) => {
    if (e.detail?.action === 'add-wealth') openWealthModal();
  };
  document.addEventListener('topbar-action', _topbarHandler);
}


// ═══════════════════════════════════════════════════════════════
// GOAL MODAL — Create / Edit a savings goal
// ═══════════════════════════════════════════════════════════════

function openGoalModal(idx) {
  const isEdit = idx !== undefined && idx !== null;
  const g = isEdit ? goals[idx] : null;

  const html = `
    <div class="modal-header">
      <div class="modal-title">${isEdit ? 'Edit' : 'New'} Savings Goal</div>
      <button class="modal-close" data-action="close-modal">✕</button>
    </div>

    <!-- Name -->
    <div class="form-group">
      <label class="form-label">Goal Name</label>
      <input class="form-input" id="mg-name" value="${g ? esc(g.n) : ''}"
             placeholder="e.g. Emergency Fund">
    </div>

    <!-- Target / Saved / Currency -->
    <div class="form-row" style="margin-bottom:var(--sp-4)">
      <div class="form-group">
        <label class="form-label">Target Amount</label>
        <input class="form-input" type="number" step="0.01" id="mg-target"
               value="${g ? g.t : ''}" placeholder="10000">
      </div>
      <div class="form-group">
        <label class="form-label">Saved So Far</label>
        <input class="form-input" type="number" step="0.01" id="mg-saved"
               value="${g ? g.s : ''}" placeholder="0">
      </div>
    </div>

    <div class="form-row" style="margin-bottom:var(--sp-4)">
      <div class="form-group">
        <label class="form-label">Currency</label>
        <select class="form-input" id="mg-curr">
          <option value="usd" ${g && g.curr === 'usd' ? 'selected' : ''}>USD ($)</option>
          <option value="gbp" ${g && g.curr === 'gbp' ? 'selected' : ''}>GBP (£)</option>
          <option value="ghs" ${g && g.curr === 'ghs' ? 'selected' : ''}>GHS (GH₵)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Deadline</label>
        <input class="form-input" type="date" id="mg-deadline"
               value="${g ? (g.d || '') : ''}">
      </div>
    </div>

    <!-- Notes -->
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-input" id="mg-notes" rows="2"
                placeholder="Optional notes…">${g ? esc(g.notes || '') : ''}</textarea>
    </div>

    <!-- Hidden index -->
    <input type="hidden" id="mg-idx" value="${isEdit ? idx : ''}">

    <!-- Actions -->
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" data-action="save-goal">
        💾 ${isEdit ? 'Update' : 'Create'} Goal
      </button>
    </div>
  `;

  openModal(html);

  // Attach save handler to the modal's action buttons
  // The modal is rendered in #modal-root, so we need delegation there
  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) {
    modalRoot.addEventListener('click', function handler(e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      if (btn.dataset.action === 'save-goal') {
        handleSaveGoal();
        modalRoot.removeEventListener('click', handler);
      } else if (btn.dataset.action === 'close-modal') {
        closeModal();
        modalRoot.removeEventListener('click', handler);
      }
    });
  }
}

/** Read form data from the goal modal and save */
function handleSaveGoal() {
  const nameEl     = document.getElementById('mg-name');
  const targetEl   = document.getElementById('mg-target');
  const savedEl    = document.getElementById('mg-saved');
  const currEl     = document.getElementById('mg-curr');
  const deadlineEl = document.getElementById('mg-deadline');
  const notesEl    = document.getElementById('mg-notes');
  const idxEl      = document.getElementById('mg-idx');

  if (!nameEl) return; // guard against modal already closed

  const name = nameEl.value.trim();
  if (!name) {
    toast('Please enter a goal name', 'error');
    nameEl.focus();
    return;
  }

  const goalData = {
    n:     name,
    t:     parseFloat(targetEl.value) || 0,
    s:     parseFloat(savedEl.value) || 0,
    curr:  currEl.value || 'usd',
    d:     deadlineEl.value || '',
    notes: notesEl.value.trim(),
  };

  const idx = idxEl.value;
  if (idx !== '') {
    // Edit existing
    goals[parseInt(idx, 10)] = goalData;
  } else {
    // Add new
    goals.push(goalData);
  }

  saveGoals();
  closeModal();
  toast('✓ Goal saved', 'success');

  // Re-render via app cycle
  import('../app.js').then(a => a.renderPage());
}


// ═══════════════════════════════════════════════════════════════
// WEALTH ENTRY MODAL — Add / Edit a monthly snapshot
// ═══════════════════════════════════════════════════════════════

function openWealthModal(idx) {
  const isEdit = idx !== undefined && idx !== null;
  const r = isEdit ? wrows[idx] : null;
  const allMonths = getAllMonths();

  const html = `
    <div class="modal-header">
      <div class="modal-title">${isEdit ? 'Edit' : 'New'} Wealth Entry</div>
      <button class="modal-close" data-action="close-modal">✕</button>
    </div>

    <!-- Month -->
    <div class="form-group">
      <label class="form-label">Month</label>
      <select class="form-input" id="mw-month">
        ${allMonths.map(m => `
          <option value="${m}" ${r && r.month === m ? 'selected' : ''}>${m}</option>
        `).join('')}
      </select>
    </div>

    <!-- USD / GBP -->
    <div class="form-row" style="margin-bottom:var(--sp-4)">
      <div class="form-group">
        <label class="form-label">USD Balance</label>
        <input class="form-input" type="number" step="0.01" id="mw-usd"
               value="${r ? r.usd : '0'}" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">GBP Balance</label>
        <input class="form-input" type="number" step="0.01" id="mw-gbp"
               value="${r ? r.gbp : '0'}" placeholder="0">
      </div>
    </div>

    <!-- GHS / Debts -->
    <div class="form-row" style="margin-bottom:var(--sp-4)">
      <div class="form-group">
        <label class="form-label">GHS Balance</label>
        <input class="form-input" type="number" step="0.01" id="mw-ghs"
               value="${r ? r.ghs : '0'}" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">Debts (USD)</label>
        <input class="form-input" type="number" step="0.01" id="mw-debts"
               value="${r ? r.debts : '0'}" placeholder="0">
      </div>
    </div>

    <!-- Notes -->
    <div class="form-group">
      <label class="form-label">Notes</label>
      <input class="form-input" id="mw-notes"
             value="${r ? esc(r.notes || '') : ''}"
             placeholder="Optional notes…">
    </div>

    <!-- Hidden index -->
    <input type="hidden" id="mw-idx" value="${isEdit ? idx : ''}">

    <!-- Actions -->
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" data-action="save-wealth">
        💾 ${isEdit ? 'Update' : 'Save'} Entry
      </button>
    </div>
  `;

  openModal(html);

  // Attach handlers to modal root
  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) {
    modalRoot.addEventListener('click', function handler(e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      if (btn.dataset.action === 'save-wealth') {
        handleSaveWealth();
        modalRoot.removeEventListener('click', handler);
      } else if (btn.dataset.action === 'close-modal') {
        closeModal();
        modalRoot.removeEventListener('click', handler);
      }
    });
  }
}

/** Read form data from the wealth modal and save */
function handleSaveWealth() {
  const monthEl = document.getElementById('mw-month');
  const usdEl   = document.getElementById('mw-usd');
  const gbpEl   = document.getElementById('mw-gbp');
  const ghsEl   = document.getElementById('mw-ghs');
  const debtsEl = document.getElementById('mw-debts');
  const notesEl = document.getElementById('mw-notes');
  const idxEl   = document.getElementById('mw-idx');

  if (!monthEl) return; // guard

  const entry = {
    month: monthEl.value,
    usd:   parseFloat(usdEl.value) || 0,
    gbp:   parseFloat(gbpEl.value) || 0,
    ghs:   parseFloat(ghsEl.value) || 0,
    debts: parseFloat(debtsEl.value) || 0,
    notes: notesEl.value.trim(),
  };

  const idx = idxEl.value;
  if (idx !== '') {
    // Edit existing row by index
    wrows[parseInt(idx, 10)] = entry;
  } else {
    // Check if this month already has an entry
    const existing = wrows.findIndex(r => r.month === entry.month);
    if (existing >= 0) {
      wrows[existing] = entry;
    } else {
      wrows.push(entry);
    }
  }

  // Sort by month order
  const allMonths = getAllMonths();
  wrows.sort((a, b) => allMonths.indexOf(a.month) - allMonths.indexOf(b.month));

  saveWrows();
  closeModal();
  toast('✓ Wealth entry saved', 'success');

  // Re-render via app cycle
  import('../app.js').then(a => a.renderPage());
}


// ═══════════════════════════════════════════════════════════════
// RE-RENDER — In-place page refresh
// ═══════════════════════════════════════════════════════════════

function rerender(container) {
  container.innerHTML = renderWealth();
  bindWealth(container);
}
