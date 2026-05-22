// ═══════════════════════════════════════════════════════════════
// LIFE OS — Expense Tracker
// Full CRUD with modal form, multi-currency, category bars.
// ═══════════════════════════════════════════════════════════════

import { state, exps, saveExps, getMonthSpend, getMonthBudget, catSpend } from '../data/store.js';
import { fc, fn, formatDate, generateId, getAllMonths, getMonthIndex } from '../lib/utils.js';
import { GHS_CATS, GHS_INC_CATS, USD_CATS, USD_INC_CATS, GBP_CATS, GBP_INC_CATS } from '../data/seedData.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getCats(curr) {
  if (curr === 'ghs') return [...GHS_CATS, ...GHS_INC_CATS];
  if (curr === 'usd') return [...USD_CATS, ...USD_INC_CATS];
  return [...GBP_CATS, ...GBP_INC_CATS];
}

function getExpCats(curr) {
  if (curr === 'ghs') return GHS_CATS;
  if (curr === 'usd') return USD_CATS;
  return GBP_CATS;
}

function currFlag(curr) {
  if (curr === 'ghs') return '🇬🇭';
  if (curr === 'usd') return '🇺🇸';
  return '🇬🇧';
}

// ── Category bar chart ──
function renderCatChart(curr, monthKey) {
  const cats = getExpCats(curr);
  const data = cats.map(cat => ({ cat, spend: catSpend(curr, monthKey, cat) }))
    .filter(r => r.spend > 0).sort((a, b) => b.spend - a.spend);

  if (!data.length) return '<div class="empty-state" style="padding:var(--sp-6)"><div class="empty-icon">📊</div><div class="empty-desc">No category data</div></div>';

  const maxVal = data[0].spend;
  return data.map((r, i) => {
    const pct = (r.spend / maxVal) * 100;
    const color = i < 3 ? 'var(--accent-teal)' : 'var(--accent-blue)';
    return `<div style="margin-bottom:var(--sp-3)">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
        <span class="truncate" style="max-width:55%">${esc(r.cat)}</span>
        <span class="font-mono" style="color:var(--text-secondary)">${fc(r.spend, curr)}</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

// ── Transaction table ──
function renderTransactionTable(curr, monthKey) {
  const allExps = exps[curr] || [];
  const filtered = allExps
    .map((e, idx) => ({ ...e, _idx: idx }))
    .filter(e => e.month === monthKey)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!filtered.length) {
    return `<div class="empty-state" style="padding:var(--sp-8)">
      <div class="empty-icon">📝</div>
      <div class="empty-desc">No expenses for ${esc(monthKey)}</div>
      <button class="btn btn-primary btn-sm" style="margin-top:var(--sp-3)" data-action="add-expense">+ Add Expense</button>
    </div>`;
  }

  return `<div class="table-wrap">
    <table class="data-table">
      <thead><tr>
        <th>Date</th><th>Category</th><th>Description</th>
        <th class="text-right">Amount</th><th></th>
      </tr></thead>
      <tbody>${filtered.map(e => `<tr>
        <td class="td-nowrap">${esc(formatDate(e.date))}</td>
        <td><span class="pill pill-blue">${esc(e.category)}</span></td>
        <td class="text-secondary">${esc(e.description)}</td>
        <td class="text-right font-mono">${fc(parseFloat(e.amount) || 0, curr)}</td>
        <td class="td-nowrap" style="text-align:right">
          <button class="btn btn-ghost btn-sm" data-action="edit-expense" data-currency="${curr}" data-idx="${e._idx}" title="Edit">✏️</button>
          <button class="btn btn-ghost btn-sm" data-action="delete-expense" data-currency="${curr}" data-idx="${e._idx}" title="Delete">🗑️</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

// ── Expense modal ──
function openExpenseModal(editIdx = -1) {
  const editing = editIdx >= 0;
  const curr = state.expCurr;
  const exp = editing ? (exps[curr] || [])[editIdx] : null;
  const initCurr = curr;
  const initDate = exp ? exp.date : new Date().toISOString().slice(0, 10);
  const initAmt = exp ? exp.amount : '';
  const initDesc = exp ? exp.description : '';
  const initMethod = exp ? (exp.method || '') : '';
  const initCat = exp ? exp.category : '';

  const catOptions = getCats(initCurr)
    .map(c => `<option value="${esc(c)}" ${c === initCat ? 'selected' : ''}>${esc(c)}</option>`)
    .join('');

  const methods = ['MoMo', 'Cash', 'Bank Transfer', 'Card', 'Other'];
  const methodOpts = methods
    .map(m => `<option value="${esc(m)}" ${m === initMethod ? 'selected' : ''}>${esc(m)}</option>`)
    .join('');

  const html = `
    <div style="margin-bottom:var(--sp-4)">
      <div class="section-title">${editing ? '✏️ Edit' : '➕ New'} Expense</div>
    </div>
    <div>
      <label class="form-label">Currency</label>
      <div class="seg-control" style="margin-bottom:var(--sp-4)">
        ${['ghs', 'usd', 'gbp'].map(c => `
          <button class="seg-btn ${c === initCurr ? 'active' : ''}"
                  data-action="switch-exp-curr" data-curr="${c}" type="button">
            ${currFlag(c)} ${c.toUpperCase()}
          </button>`).join('')}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="exp-date">Date</label>
          <input class="form-input" type="date" id="exp-date" value="${esc(initDate)}">
        </div>
        <div class="form-group">
          <label class="form-label" for="exp-amount">Amount</label>
          <input class="form-input" type="number" id="exp-amount" step="0.01" min="0" placeholder="0.00" value="${esc(String(initAmt))}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="exp-category">Category</label>
        <select class="form-input" id="exp-category">${catOptions}</select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="exp-method">Payment Method</label>
          <select class="form-input" id="exp-method">
            <option value="">— Select —</option>${methodOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="exp-desc">Description</label>
          <input class="form-input" type="text" id="exp-desc" placeholder="What was this for?" value="${esc(initDesc)}">
        </div>
      </div>
      <input type="hidden" id="exp-edit-idx" value="${editing ? editIdx : ''}">
      <input type="hidden" id="exp-orig-curr" value="${initCurr}">
    </div>
    <div style="display:flex;gap:var(--sp-3);justify-content:flex-end;margin-top:var(--sp-6)">
      <button class="btn btn-ghost" data-action="modal-cancel" type="button">Cancel</button>
      <button class="btn btn-primary" data-action="save-expense" type="button">
        💾 ${editing ? 'Update' : 'Save'} Expense
      </button>
    </div>`;

  import('../app.js').then(app => {
    app.openModal(html);
    const modal = document.getElementById('modal-root');
    if (!modal) return;

    // Currency switcher
    modal.querySelectorAll('[data-action="switch-exp-curr"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newCurr = btn.dataset.curr;
        modal.querySelectorAll('[data-action="switch-exp-curr"]').forEach(b => {
          b.classList.toggle('active', b.dataset.curr === newCurr);
        });
        const catSelect = modal.querySelector('#exp-category');
        if (catSelect) {
          catSelect.innerHTML = getCats(newCurr)
            .map(c => `<option value="${esc(c)}">${esc(c)}</option>`)
            .join('');
        }
        const origInput = modal.querySelector('#exp-orig-curr');
        if (origInput) origInput.value = newCurr;
      });
    });

    // Save
    modal.querySelector('[data-action="save-expense"]')?.addEventListener('click', () => {
      const saveCurr = (modal.querySelector('#exp-orig-curr')?.value || initCurr).toLowerCase();
      const date = modal.querySelector('#exp-date')?.value || '';
      const category = modal.querySelector('#exp-category')?.value || '';
      const amount = parseFloat(modal.querySelector('#exp-amount')?.value) || 0;
      const method = modal.querySelector('#exp-method')?.value || '';
      const desc = modal.querySelector('#exp-desc')?.value || '';
      const editIdxVal = modal.querySelector('#exp-edit-idx')?.value;
      const isEditing = editIdxVal !== '' && editIdxVal !== undefined;

      if (!date || !category || amount <= 0) {
        app.toast('Please fill date, category, and amount.', 'error');
        return;
      }

      const expObj = {
        id: isEditing ? ((exps[saveCurr] || [])[parseInt(editIdxVal)]?.id || generateId()) : generateId(),
        month: state.selectedMonth, date, category, description: desc, amount, method, notes: '',
      };

      if (!exps[saveCurr]) exps[saveCurr] = [];
      if (isEditing) {
        const idx = parseInt(editIdxVal);
        if (saveCurr !== curr) { exps[curr].splice(idx, 1); exps[saveCurr].push(expObj); }
        else exps[saveCurr][idx] = expObj;
      } else {
        exps[saveCurr].push(expObj);
      }

      saveExps();
      app.closeModal();
      app.toast(`✓ Expense ${isEditing ? 'updated' : 'saved'}`, 'success');
      state.expCurr = saveCurr;
      app.renderPage();
    });

    // Cancel
    modal.querySelector('[data-action="modal-cancel"]')?.addEventListener('click', () => app.closeModal());
  });
}

// ── Delete modal ──
function openDeleteModal(curr, idx) {
  const exp = (exps[curr] || [])[idx];
  if (!exp) return;
  import('../app.js').then(app => {
    app.openModal(`
      <div style="margin-bottom:var(--sp-4)"><div class="section-title">🗑️ Delete Expense</div></div>
      <p class="text-secondary" style="margin-bottom:var(--sp-4)">Are you sure you want to delete this expense?</p>
      <div class="card-sm" style="margin-bottom:var(--sp-4)">
        <div style="display:flex;justify-content:space-between;margin-bottom:var(--sp-2)">
          <span class="pill pill-blue">${esc(exp.category)}</span>
          <span class="font-mono">${fc(parseFloat(exp.amount) || 0, curr)}</span>
        </div>
        <div class="text-secondary" style="font-size:12px">${esc(formatDate(exp.date))} ${exp.description ? '— ' + esc(exp.description) : ''}</div>
      </div>
      <div style="display:flex;gap:var(--sp-3);justify-content:flex-end">
        <button class="btn btn-ghost" data-action="modal-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-del">🗑️ Delete</button>
      </div>
    `);
    const modal = document.getElementById('modal-root');
    modal.querySelector('#confirm-del')?.addEventListener('click', () => {
      exps[curr].splice(idx, 1);
      saveExps();
      app.closeModal();
      app.toast('✓ Expense deleted', 'success');
      app.renderPage();
    });
    modal.querySelector('[data-action="modal-cancel"]')?.addEventListener('click', () => app.closeModal());
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════════════

export function renderExpenses() {
  const curr = state.expCurr || 'ghs';
  const monthKey = state.selectedMonth;
  const mi = getMonthIndex(monthKey);
  const expCats = getExpCats(curr);

  const totalSpent = getMonthSpend(curr, monthKey);
  const budget = getMonthBudget(curr, mi, expCats);
  const remaining = budget - totalSpent;
  const txCount = (exps[curr] || []).filter(e => e.month === monthKey).length;

  return `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">💳 Expenses</h1>
        <p class="page-sub">Track every transaction</p>
      </div>

      <div class="seg-control mb-6">
        ${['ghs', 'usd', 'gbp'].map(c => `
          <button class="seg-btn ${curr === c ? 'active' : ''}"
                  data-action="exp-switch-curr" data-curr="${c}">
            ${currFlag(c)} ${c.toUpperCase()}
          </button>`).join('')}
      </div>

      <div class="grid-4 mb-6">
        <div class="card stat-card">
          <div class="stat-label">Total Spent</div>
          <div class="stat-value">${fc(totalSpent, curr)}</div>
          <div class="stat-sub">${esc(monthKey)}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Budget</div>
          <div class="stat-value" style="color:var(--accent-teal)">${fc(budget, curr)}</div>
          <div class="stat-sub">${esc(monthKey)}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">${remaining >= 0 ? 'Remaining' : 'Overspent'}</div>
          <div class="stat-value" style="color:${remaining >= 0 ? 'var(--accent-teal)' : 'var(--accent-rose)'}">${fc(Math.abs(remaining), curr)}</div>
          <div class="stat-sub">${remaining >= 0 ? 'under budget' : 'over budget'}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Transactions</div>
          <div class="stat-value">${fn(txCount)}</div>
          <div class="stat-sub">this month</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--sp-4)" class="mb-6">
        <div class="card">
          <div class="section-header" style="margin-bottom:var(--sp-4)">
            <div class="section-title">Transactions</div>
            <button class="btn btn-primary btn-sm" data-action="add-expense">+ Add Expense</button>
          </div>
          ${renderTransactionTable(curr, monthKey)}
        </div>
        <div class="card">
          <div class="section-title" style="margin-bottom:var(--sp-4)">Category Breakdown</div>
          ${renderCatChart(curr, monthKey)}
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// BIND
// ═══════════════════════════════════════════════════════════════

let _topbarHandler = null;

export function bindExpenses(container) {
  container.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case 'exp-switch-curr': {
        const newCurr = target.dataset.curr;
        if (newCurr === state.expCurr) return;
        state.expCurr = newCurr;
        import('../app.js').then(app => app.renderPage());
        break;
      }
      case 'add-expense': openExpenseModal(-1); break;
      case 'edit-expense': {
        const idx = parseInt(target.dataset.idx);
        const curr = target.dataset.currency || state.expCurr;
        state.expCurr = curr;
        openExpenseModal(idx);
        break;
      }
      case 'delete-expense': {
        const idx = parseInt(target.dataset.idx);
        const curr = target.dataset.currency || state.expCurr;
        openDeleteModal(curr, idx);
        break;
      }
    }
  });

  // Topbar listener (with cleanup)
  if (_topbarHandler) document.removeEventListener('topbar-action', _topbarHandler);
  _topbarHandler = (e) => {
    if (e.detail === 'add-expense' || e.detail === 'add' || (e.detail && e.detail.action === 'add-expense'))
      openExpenseModal(-1);
  };
  document.addEventListener('topbar-action', _topbarHandler);
}
