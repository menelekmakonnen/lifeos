// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Life Hub Page
// Five-tab module: Activities, Rhythm, Meals, Beauty, Rules
// All CRUD flows use proper modals — NO prompt() dialogs.
// ═══════════════════════════════════════════════════════════════

import {
  state, activities, beauty, rhythm, rules, meals,
  saveActivities, saveBeauty, saveRhythm, saveRules, saveMeals,
} from '../data/store.js';
import { getAllMonths, getMonthName, generateId } from '../lib/utils.js';
import { MKEYS } from '../data/seedData.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TABS = [
  { id: 'activities', label: 'Activities', icon: '🎯' },
  { id: 'rhythm', label: 'Rhythm', icon: '⏰' },
  { id: 'meals', label: 'Meals', icon: '🍽️' },
  { id: 'beauty', label: 'Beauty', icon: '💇' },
  { id: 'rules', label: 'Rules', icon: '📜' },
];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMOJIS = ['🎯', '🏃', '📚', '🎨', '🎵', '🧘', '🏊', '⚽', '🎮', '🍳', '✈️', '💪', '🎬', '🌿', '🛍️'];
function randomEmoji() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)]; }

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════

export function renderLife() {
  const tab = state.lifeTab || 'activities';

  const tabsHtml = TABS.map(t =>
    `<button class="seg-btn ${tab === t.id ? 'active' : ''}"
             data-action="life-tab" data-tab="${t.id}">
       ${t.icon} ${t.label}
     </button>`
  ).join('');

  let content = '';
  switch (tab) {
    case 'activities': content = renderActivities(); break;
    case 'rhythm': content = renderRhythm(); break;
    case 'meals': content = renderMeals(); break;
    case 'beauty': content = renderBeauty(); break;
    case 'rules': content = renderRulesTab(); break;
  }

  return `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">🌟 Life Hub</h1>
        <p class="page-sub">Organise your lifestyle</p>
      </div>
      <div class="seg-control mb-6" style="overflow-x:auto">${tabsHtml}</div>
      <div>${content}</div>
    </div>`;
}

// ── Activities ──
function renderActivities() {
  const months = getAllMonths();
  const grouped = {};
  months.forEach(mk => { grouped[mk] = []; });
  activities.forEach((a, i) => {
    const key = a.m || months[0];
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ ...a, _idx: i });
  });

  const activeMonths = months.filter(mk => grouped[mk] && grouped[mk].length > 0);

  const html = activeMonths.length
    ? activeMonths.map(mk => `
        <div style="margin-bottom:var(--sp-6)">
          <div class="section-title" style="margin-bottom:var(--sp-3)">${esc(mk)}</div>
          <div class="grid-auto">
            ${grouped[mk].map(a => `
              <div class="card-sm" style="position:relative">
                <div style="font-size:28px;margin-bottom:var(--sp-2)">${a.i || '🎯'}</div>
                <div style="font-weight:600;font-size:14px;margin-bottom:var(--sp-1)">${esc(a.n || '')}</div>
                <div class="text-secondary" style="font-size:13px;margin-bottom:var(--sp-2)">${esc(a.d || '')}</div>
                ${a.b ? `<div class="font-mono" style="color:var(--accent-gold);font-size:13px">${esc(a.b)}</div>` : ''}
                <button class="btn btn-ghost btn-sm" style="position:absolute;top:var(--sp-2);right:var(--sp-2)"
                        data-action="life-del-activity" data-idx="${a._idx}">✕</button>
              </div>
            `).join('')}
          </div>
        </div>`).join('')
    : '<div class="card" style="text-align:center;padding:var(--sp-8)"><div style="font-size:32px;margin-bottom:var(--sp-3)">🎯</div><div class="text-secondary">No activities yet. Add your first one!</div></div>';

  return `
    <div class="section-header" style="margin-bottom:var(--sp-4)">
      <div class="section-title">Planned Activities</div>
      <button class="btn btn-primary btn-sm" data-action="life-add-activity">+ Add Activity</button>
    </div>
    ${html}`;
}

// ── Rhythm ──
function renderRhythm() {
  const timelineHtml = rhythm.length
    ? rhythm.map(entry => {
        const [time, desc] = Array.isArray(entry) ? entry : [entry.time || '', entry.desc || ''];
        return `
          <div style="display:flex;gap:var(--sp-4);padding:var(--sp-3) 0;border-bottom:1px solid var(--border-subtle)">
            <div style="min-width:80px;text-align:right">
              <span class="font-mono" style="font-size:13px;color:var(--accent-blue);font-weight:600">${esc(time)}</span>
            </div>
            <div style="width:2px;background:var(--border-default);position:relative;flex-shrink:0">
              <div style="width:8px;height:8px;border-radius:50%;background:var(--accent-blue);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"></div>
            </div>
            <div style="flex:1;font-size:14px;color:var(--text-primary)">${esc(desc)}</div>
          </div>`;
      }).join('')
    : '<div class="card" style="text-align:center;padding:var(--sp-8)"><div style="font-size:32px;margin-bottom:var(--sp-3)">⏰</div><div class="text-secondary">No daily rhythm set. Create your ideal day!</div></div>';

  return `
    <div class="section-header" style="margin-bottom:var(--sp-4)">
      <div class="section-title">Daily Rhythm</div>
      <button class="btn btn-primary btn-sm" data-action="life-edit-rhythm">✎ Edit</button>
    </div>
    <div class="card" style="padding:var(--sp-4)">${timelineHtml}</div>`;
}

// ── Meals ──
function renderMeals() {
  const mealData = WEEKDAYS.map((day, i) => {
    const existing = meals.find(m => m.day === day) || meals[i] || {};
    return { day, b: existing.b || '—', l: existing.l || '—', d: existing.d || '—', g: existing.g || '' };
  });

  return `
    <div class="section-header" style="margin-bottom:var(--sp-4)">
      <div class="section-title">Weekly Meal Plan</div>
      <button class="btn btn-primary btn-sm" data-action="life-edit-meals">✎ Edit</button>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th><th>Grocery</th></tr></thead>
        <tbody>
          ${mealData.map(m => `<tr>
            <td style="font-weight:600">${esc(m.day)}</td>
            <td>${esc(m.b)}</td><td>${esc(m.l)}</td><td>${esc(m.d)}</td>
            <td class="text-secondary" style="font-size:12px">${esc(m.g)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Beauty ──
function renderBeauty() {
  const cardsHtml = beauty.length
    ? beauty.map((b, i) => `
        <div class="card-sm" style="position:relative">
          <span class="pill pill-purple" style="margin-bottom:var(--sp-2);display:inline-block">${esc(b.m || '')}</span>
          <div style="font-weight:600;font-size:14px;margin-bottom:var(--sp-1)">${esc(b.s || '')}</div>
          <div class="text-secondary" style="font-size:13px;margin-bottom:var(--sp-2)">${esc(b.d || '')}</div>
          ${b.c ? `<div class="font-mono" style="color:var(--accent-rose);font-size:13px">${esc(b.c)}</div>` : ''}
          <button class="btn btn-ghost btn-sm" style="position:absolute;top:var(--sp-2);right:var(--sp-2)"
                  data-action="life-del-beauty" data-idx="${i}">✕</button>
        </div>`).join('')
    : '<div class="card" style="text-align:center;padding:var(--sp-8)"><div style="font-size:32px;margin-bottom:var(--sp-3)">💇</div><div class="text-secondary">No beauty appointments. Add one!</div></div>';

  return `
    <div class="section-header" style="margin-bottom:var(--sp-4)">
      <div class="section-title">Beauty Calendar</div>
      <button class="btn btn-primary btn-sm" data-action="life-add-beauty">+ Add</button>
    </div>
    <div class="grid-auto">${cardsHtml}</div>`;
}

// ── Rules ──
function renderRulesTab() {
  const listHtml = rules.length
    ? rules.map((r, i) => `
        <div style="display:flex;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);margin-bottom:var(--sp-2);background:var(--bg-surface-2);border-radius:var(--radius-md)">
          <span style="font-weight:700;font-size:16px;color:var(--accent-blue);min-width:28px">${i + 1}</span>
          <span style="font-size:14px;line-height:1.5">${esc(r)}</span>
        </div>`).join('')
    : '<div class="card" style="text-align:center;padding:var(--sp-8)"><div style="font-size:32px;margin-bottom:var(--sp-3)">📜</div><div class="text-secondary">No rules yet. Define your principles!</div></div>';

  return `
    <div class="section-header" style="margin-bottom:var(--sp-4)">
      <div class="section-title">Personal Rules</div>
      <button class="btn btn-primary btn-sm" data-action="life-edit-rules">✎ Edit</button>
    </div>
    ${listHtml}
    <p style="text-align:center;color:var(--text-tertiary);font-style:italic;margin-top:var(--sp-5);font-size:13px">
      "Discipline is choosing between what you want now and what you want most."
    </p>`;
}

// ═══════════════════════════════════════════════════════════════
// BIND
// ═══════════════════════════════════════════════════════════════

export function bindLife(container) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
      case 'life-tab':
        state.lifeTab = btn.dataset.tab;
        import('../app.js').then(a => a.renderPage());
        break;

      case 'life-add-activity':
        _openActivityModal();
        break;

      case 'life-del-activity': {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx >= 0 && idx < activities.length) {
          activities.splice(idx, 1);
          saveActivities();
          import('../app.js').then(a => { a.toast('Activity removed', 'success'); a.renderPage(); });
        }
        break;
      }

      case 'life-save-activity': {
        const nameEl = document.getElementById('life-act-name');
        const name = (nameEl?.value || '').trim();
        if (!name) { import('../app.js').then(a => a.toast('Please enter a name', 'error')); return; }
        activities.push({
          m: document.getElementById('life-act-month')?.value || getAllMonths()[0],
          i: randomEmoji(), n: name,
          d: document.getElementById('life-act-detail')?.value || '',
          b: document.getElementById('life-act-budget')?.value || '',
        });
        saveActivities();
        import('../app.js').then(a => { a.closeModal(); a.toast('Activity added', 'success'); a.renderPage(); });
        break;
      }

      case 'life-edit-rhythm': _openRhythmModal(); break;

      case 'life-save-rhythm': {
        const rows = document.querySelectorAll('#rhythm-rows .rhythm-edit-row');
        const newR = [];
        rows.forEach(row => {
          const t = row.querySelector('[data-field="time"]')?.value.trim() || '';
          const d = row.querySelector('[data-field="desc"]')?.value.trim() || '';
          if (t || d) newR.push([t, d]);
        });
        rhythm.length = 0;
        newR.forEach(r => rhythm.push(r));
        saveRhythm();
        import('../app.js').then(a => { a.closeModal(); a.toast('Rhythm updated', 'success'); a.renderPage(); });
        break;
      }

      case 'life-rhythm-add-row': {
        const list = document.getElementById('rhythm-rows');
        if (list) {
          list.insertAdjacentHTML('beforeend', `
            <div class="rhythm-edit-row" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-2)">
              <input class="form-input" type="text" data-field="time" placeholder="e.g. 9:00 AM" style="width:120px;flex-shrink:0">
              <input class="form-input" type="text" data-field="desc" placeholder="Activity" style="flex:1">
              <button class="btn btn-ghost btn-sm" data-action="life-rhythm-del-row">✕</button>
            </div>`);
        }
        break;
      }

      case 'life-rhythm-del-row':
        btn.closest('.rhythm-edit-row')?.remove();
        break;

      case 'life-edit-meals': _openMealsModal(); break;

      case 'life-save-meals': {
        const rows = document.querySelectorAll('.meal-edit-row');
        const newM = [];
        rows.forEach(row => {
          newM.push({
            day: row.dataset.day,
            b: row.querySelector('[data-field="b"]')?.value.trim() || '',
            l: row.querySelector('[data-field="l"]')?.value.trim() || '',
            d: row.querySelector('[data-field="d"]')?.value.trim() || '',
            g: row.querySelector('[data-field="g"]')?.value.trim() || '',
          });
        });
        meals.length = 0;
        newM.forEach(m => meals.push(m));
        saveMeals();
        import('../app.js').then(a => { a.closeModal(); a.toast('Meal plan updated', 'success'); a.renderPage(); });
        break;
      }

      case 'life-add-beauty': _openBeautyModal(); break;

      case 'life-del-beauty': {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx >= 0 && idx < beauty.length) {
          beauty.splice(idx, 1);
          saveBeauty();
          import('../app.js').then(a => { a.toast('Entry removed', 'success'); a.renderPage(); });
        }
        break;
      }

      case 'life-save-beauty': {
        const svc = document.getElementById('life-bty-service')?.value.trim();
        if (!svc) { import('../app.js').then(a => a.toast('Please enter a service', 'error')); return; }
        beauty.push({
          m: document.getElementById('life-bty-month')?.value || getAllMonths()[0],
          s: svc,
          d: document.getElementById('life-bty-detail')?.value || '',
          c: document.getElementById('life-bty-cost')?.value || '',
        });
        saveBeauty();
        import('../app.js').then(a => { a.closeModal(); a.toast('Entry added', 'success'); a.renderPage(); });
        break;
      }

      case 'life-edit-rules': _openRulesModal(); break;

      case 'life-save-rules': {
        const text = document.getElementById('life-rules-text')?.value || '';
        const newRules = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
        rules.length = 0;
        newRules.forEach(r => rules.push(r));
        saveRules();
        import('../app.js').then(a => { a.closeModal(); a.toast('Rules updated', 'success'); a.renderPage(); });
        break;
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════

function _openActivityModal() {
  const opts = getAllMonths().map(mk => `<option value="${mk}">${esc(mk)}</option>`).join('');
  import('../app.js').then(app => {
    app.openModal(`
      <div style="margin-bottom:var(--sp-4)"><div class="section-title">Add Activity</div></div>
      <div class="form-group">
        <label class="form-label">Month</label>
        <select class="form-input" id="life-act-month">${opts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" type="text" id="life-act-name" placeholder="e.g. Morning Hike">
      </div>
      <div class="form-group">
        <label class="form-label">Details</label>
        <input class="form-input" type="text" id="life-act-detail" placeholder="Description or schedule">
      </div>
      <div class="form-group">
        <label class="form-label">Budget</label>
        <input class="form-input" type="text" id="life-act-budget" placeholder="e.g. ~GHS 300 or FREE">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:var(--sp-3)">
        <button class="btn btn-ghost" onclick="import('../app.js').then(a=>a.closeModal())">Cancel</button>
        <button class="btn btn-primary" data-action="life-save-activity">✚ Add Activity</button>
      </div>
    `);
  });
}

function _openRhythmModal() {
  const rowsHtml = rhythm.length
    ? rhythm.map(entry => {
        const [t, d] = Array.isArray(entry) ? entry : [entry.time || '', entry.desc || ''];
        return `<div class="rhythm-edit-row" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-2)">
          <input class="form-input" type="text" data-field="time" value="${esc(t)}" placeholder="e.g. 9:00 AM" style="width:120px;flex-shrink:0">
          <input class="form-input" type="text" data-field="desc" value="${esc(d)}" placeholder="Activity" style="flex:1">
          <button class="btn btn-ghost btn-sm" data-action="life-rhythm-del-row">✕</button>
        </div>`;
      }).join('')
    : `<div class="rhythm-edit-row" style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-2)">
        <input class="form-input" type="text" data-field="time" placeholder="e.g. 6:00 AM" style="width:120px;flex-shrink:0">
        <input class="form-input" type="text" data-field="desc" placeholder="Activity" style="flex:1">
        <button class="btn btn-ghost btn-sm" data-action="life-rhythm-del-row">✕</button>
      </div>`;

  import('../app.js').then(app => {
    app.openModal(`
      <div style="margin-bottom:var(--sp-4)"><div class="section-title">Edit Daily Rhythm</div></div>
      <p class="text-secondary" style="font-size:13px;margin-bottom:var(--sp-3)">Define your ideal day — time and activity for each block.</p>
      <div id="rhythm-rows">${rowsHtml}</div>
      <button class="btn btn-ghost btn-sm" data-action="life-rhythm-add-row" style="margin-top:var(--sp-2)">+ Add Time Block</button>
      <div style="display:flex;justify-content:flex-end;gap:var(--sp-3);margin-top:var(--sp-4)">
        <button class="btn btn-ghost" onclick="import('../app.js').then(a=>a.closeModal())">Cancel</button>
        <button class="btn btn-primary" data-action="life-save-rhythm">💾 Save Rhythm</button>
      </div>
    `);
  });
}

function _openMealsModal() {
  const mealData = WEEKDAYS.map((day, i) => {
    const existing = meals.find(m => m.day === day) || meals[i] || {};
    return { day, b: existing.b || '', l: existing.l || '', d: existing.d || '', g: existing.g || '' };
  });

  import('../app.js').then(app => {
    app.openModal(`
      <div style="margin-bottom:var(--sp-4)"><div class="section-title">Edit Meal Plan</div></div>
      <p class="text-secondary" style="font-size:13px;margin-bottom:var(--sp-3)">Plan your weekly meals.</p>
      ${mealData.map(m => `
        <div class="meal-edit-row" data-day="${m.day}" style="margin-bottom:var(--sp-3)">
          <div style="font-weight:600;font-size:13px;margin-bottom:var(--sp-1)">${esc(m.day)}</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-2)">
            <input class="form-input" type="text" data-field="b" value="${esc(m.b)}" placeholder="Breakfast" style="font-size:12px">
            <input class="form-input" type="text" data-field="l" value="${esc(m.l)}" placeholder="Lunch" style="font-size:12px">
            <input class="form-input" type="text" data-field="d" value="${esc(m.d)}" placeholder="Dinner" style="font-size:12px">
            <input class="form-input" type="text" data-field="g" value="${esc(m.g)}" placeholder="Grocery" style="font-size:12px">
          </div>
        </div>`).join('')}
      <div style="display:flex;justify-content:flex-end;gap:var(--sp-3);margin-top:var(--sp-4)">
        <button class="btn btn-ghost" onclick="import('../app.js').then(a=>a.closeModal())">Cancel</button>
        <button class="btn btn-primary" data-action="life-save-meals">💾 Save Meals</button>
      </div>
    `);
  });
}

function _openBeautyModal() {
  const opts = getAllMonths().map(mk => `<option value="${mk}">${esc(mk)}</option>`).join('');
  import('../app.js').then(app => {
    app.openModal(`
      <div style="margin-bottom:var(--sp-4)"><div class="section-title">Add Beauty Entry</div></div>
      <div class="form-group">
        <label class="form-label">Month</label>
        <select class="form-input" id="life-bty-month">${opts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Service</label>
        <input class="form-input" type="text" id="life-bty-service" placeholder="e.g. Cornrows + Dye">
      </div>
      <div class="form-group">
        <label class="form-label">Details</label>
        <input class="form-input" type="text" id="life-bty-detail" placeholder="Schedule & notes">
      </div>
      <div class="form-group">
        <label class="form-label">Cost</label>
        <input class="form-input" type="text" id="life-bty-cost" placeholder="e.g. GHS 500">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:var(--sp-3)">
        <button class="btn btn-ghost" onclick="import('../app.js').then(a=>a.closeModal())">Cancel</button>
        <button class="btn btn-primary" data-action="life-save-beauty">✚ Add Entry</button>
      </div>
    `);
  });
}

function _openRulesModal() {
  import('../app.js').then(app => {
    app.openModal(`
      <div style="margin-bottom:var(--sp-4)"><div class="section-title">Edit Personal Rules</div></div>
      <p class="text-secondary" style="font-size:13px;margin-bottom:var(--sp-3)">One rule per line. These are your non-negotiables.</p>
      <div class="form-group">
        <textarea class="form-input" id="life-rules-text" rows="12" style="resize:vertical"
                  placeholder="Rule 1&#10;Rule 2&#10;Rule 3">${esc(rules.join('\n'))}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:var(--sp-3)">
        <button class="btn btn-ghost" onclick="import('../app.js').then(a=>a.closeModal())">Cancel</button>
        <button class="btn btn-primary" data-action="life-save-rules">💾 Save Rules</button>
      </div>
    `);
  });
}
