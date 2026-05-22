// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Calendar Page
// Monthly calendar with Google Calendar sync, day cells,
// activity chips, and a date-detail modal.
// ═══════════════════════════════════════════════════════════════

import { state, calActs, saveCalActs, prefs } from '../data/store.js';
import {
  getCurrentYear, getMonthIndex, getMonthName,
  getMonthDays, getAllMonths,
} from '../lib/utils.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Module-level state ──
let calYear = getCurrentYear();
let calMonth = new Date().getMonth();
let gCalEvents = {}; // dateKey → [{text, time, color}]
let gCalLoading = false;
let gCalError = null;
let gCalLastFetch = null;
let _topbarHandler = null;

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHIP_COLORS = {
  teal: 'var(--accent-teal)', gold: 'var(--accent-gold)',
  rose: 'var(--accent-rose)', blue: 'var(--accent-blue)',
  purple: 'var(--accent-purple)',
};

// ── Google Calendar Fetch ──
async function fetchGoogleCalEvents() {
  const url = prefs.gasUrl;
  if (!url || !url.startsWith('https://script.google.com')) return;

  gCalLoading = true;
  gCalError = null;
  _rerender();

  try {
    const startDate = new Date(calYear, calMonth, 1).toISOString();
    const endDate = new Date(calYear, calMonth + 1, 0, 23, 59, 59).toISOString();

    const res = await fetch(url + '?action=gcal_events&start=' + encodeURIComponent(startDate) + '&end=' + encodeURIComponent(endDate));
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    // Parse events into dateKey → array format
    const events = data.events || [];
    const parsed = {};
    events.forEach(e => {
      // Handle all-day and timed events
      const dateStr = (e.start || '').slice(0, 10);
      if (!dateStr) return;
      if (!parsed[dateStr]) parsed[dateStr] = [];
      const timeStr = e.allDay ? '' : (e.start || '').slice(11, 16);
      parsed[dateStr].push({
        text: e.title || 'Untitled',
        time: timeStr,
        color: 'purple', // Google events get purple
        isGCal: true,
      });
    });

    gCalEvents = parsed;
    gCalLastFetch = new Date();
    gCalLoading = false;
    _rerender();
  } catch (err) {
    console.warn('[GCal] Fetch failed:', err.message);
    gCalError = err.message;
    gCalLoading = false;
    _rerender();
  }
}

// ── Get merged activities for a date ──
function getMergedActivities(dateKey) {
  const local = _getLocalActivities(dateKey);
  const gcal = gCalEvents[dateKey] || [];
  return [...gcal, ...local];
}

function _getLocalActivities(dateKey) {
  const raw = calActs[dateKey];
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(a => {
    if (typeof a === 'string') return { text: a, time: '', color: 'teal' };
    return { text: a.text || '', time: a.time || '', color: a.color || 'teal' };
  });
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════

export function renderCalendar() {
  const today = new Date();
  const todayStr = _dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  // Build day cells
  let cellsHtml = '';
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDow + 1;
    let dateKey = '', displayNum = '', extraClass = '';

    if (dayNum < 1) {
      const d = prevMonthDays + dayNum;
      dateKey = _dateKey(calYear, calMonth - 1, d);
      displayNum = d;
      extraClass = 'other-month';
    } else if (dayNum > daysInMonth) {
      const d = dayNum - daysInMonth;
      dateKey = _dateKey(calYear, calMonth + 1, d);
      displayNum = d;
      extraClass = 'other-month';
    } else {
      dateKey = _dateKey(calYear, calMonth, dayNum);
      displayNum = dayNum;
      if (dateKey === todayStr) extraClass = 'today';
    }

    const dayActivities = getMergedActivities(dateKey);
    const chipLimit = 3;
    const chipsHtml = dayActivities.slice(0, chipLimit).map(a => {
      const color = CHIP_COLORS[a.color] || CHIP_COLORS.teal;
      const label = a.time ? `${a.time} ${esc(a.text)}` : esc(a.text);
      const gcalMark = a.isGCal ? ' gcal' : '';
      return `<span class="cal-chip${gcalMark}" style="--chip-color:${color}" title="${esc(label)}">${label}</span>`;
    }).join('');

    const moreCount = dayActivities.length - chipLimit;
    const moreHtml = moreCount > 0
      ? `<span class="cal-more">+${moreCount} more</span>`
      : '';

    cellsHtml += `
      <div class="cal-cell ${extraClass}" data-action="cal-day-click" data-date="${dateKey}">
        <span class="cal-day-num">${displayNum}</span>
        <div class="cal-chips">${chipsHtml}${moreHtml}</div>
      </div>`;
  }

  // Month tabs
  const monthTabsHtml = Array.from({ length: 12 }, (_, i) => {
    const active = i === calMonth ? 'active' : '';
    return `<button class="seg-btn ${active}" data-action="cal-month-tab" data-month="${i}">${getMonthName(i).slice(0, 3)}</button>`;
  }).join('');

  // Google Cal status
  const hasGas = prefs.gasUrl && prefs.gasUrl.startsWith('https://');
  let gCalStatusHtml = '';
  if (hasGas) {
    if (gCalLoading) {
      gCalStatusHtml = '<span class="pill pill-blue" style="gap:4px;font-size:11px">⟳ Syncing Google Calendar…</span>';
    } else if (gCalError) {
      gCalStatusHtml = `<span class="pill pill-rose" style="gap:4px;font-size:11px">⚠ ${esc(gCalError)}</span>`;
    } else if (gCalLastFetch) {
      gCalStatusHtml = '<span class="pill pill-teal" style="gap:4px;font-size:11px">✓ Google Calendar synced</span>';
    }
  }

  return `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">📅 Calendar</h1>
          <p class="page-sub">${getMonthName(calMonth)} ${calYear}</p>
        </div>
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          ${gCalStatusHtml}
          ${hasGas ? `<button class="btn btn-ghost btn-sm" data-action="cal-gcal-sync" ${gCalLoading ? 'disabled' : ''}>
            🔄 Sync Google Cal
          </button>` : ''}
        </div>
      </div>

      <!-- Year navigator -->
      <div class="cal-year-nav">
        <button class="btn btn-ghost btn-sm" data-action="cal-prev-year" title="Previous year">◂</button>
        <span class="cal-year-label">${calYear}</span>
        <button class="btn btn-ghost btn-sm" data-action="cal-next-year" title="Next year">▸</button>
      </div>

      <!-- Month tabs -->
      <div class="seg-control seg-scroll mb-4">${monthTabsHtml}</div>

      <!-- Calendar grid -->
      <div class="cal-grid">
        ${DAY_HEADERS.map(d => `<div class="cal-header">${d}</div>`).join('')}
        ${cellsHtml}
      </div>

      ${!hasGas ? `
        <div class="card mt-6" style="text-align:center;padding:var(--sp-5)">
          <div style="font-size:24px;margin-bottom:var(--sp-2)">📆</div>
          <div style="font-weight:600;margin-bottom:var(--sp-2)">Connect Google Calendar</div>
          <div class="text-secondary" style="font-size:13px;margin-bottom:var(--sp-3)">
            Set up your Google Sheets sync in Settings to see Google Calendar events here.
          </div>
          <button class="btn btn-primary btn-sm" data-action="cal-go-settings">⚙️ Go to Settings</button>
        </div>
      ` : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// BIND
// ═══════════════════════════════════════════════════════════════

export function bindCalendar(container) {
  // Auto-fetch Google Cal events on load if configured
  if (prefs.gasUrl && prefs.gasUrl.startsWith('https://') && !gCalLastFetch) {
    fetchGoogleCalEvents();
  }

  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
      case 'cal-prev-year':
        calYear--;
        gCalEvents = {};
        _rerender();
        if (prefs.gasUrl) fetchGoogleCalEvents();
        break;

      case 'cal-next-year':
        calYear++;
        gCalEvents = {};
        _rerender();
        if (prefs.gasUrl) fetchGoogleCalEvents();
        break;

      case 'cal-month-tab':
        calMonth = parseInt(btn.dataset.month, 10);
        gCalEvents = {};
        _rerender();
        if (prefs.gasUrl) fetchGoogleCalEvents();
        break;

      case 'cal-day-click':
        _openDayModal(btn.dataset.date);
        break;

      case 'cal-gcal-sync':
        fetchGoogleCalEvents();
        break;

      case 'cal-go-settings':
        import('../app.js').then(app => app.navigate('settings'));
        break;

      case 'cal-delete-event': {
        const dateKey = btn.dataset.date;
        const idx = parseInt(btn.dataset.idx, 10);
        const items = calActs[dateKey];
        if (items) {
          items.splice(idx, 1);
          if (items.length === 0) delete calActs[dateKey];
          saveCalActs();
          _openDayModal(dateKey); // re-open refreshed
          import('../app.js').then(a => a.toast('Event removed', 'success'));
        }
        break;
      }

      case 'cal-save-event': {
        const dateKey = btn.dataset.date;
        const textInput = document.getElementById('cal-evt-text');
        const timeInput = document.getElementById('cal-evt-time');
        const colorInput = document.getElementById('cal-evt-color');

        const text = (textInput?.value || '').trim();
        if (!text) {
          import('../app.js').then(a => a.toast('Please enter event text', 'error'));
          return;
        }

        if (!calActs[dateKey]) calActs[dateKey] = [];
        calActs[dateKey].push({
          text,
          time: timeInput?.value || '',
          color: colorInput?.value || 'teal',
        });
        saveCalActs();
        _openDayModal(dateKey); // re-open refreshed
        import('../app.js').then(a => a.toast('Event added', 'success'));
        break;
      }
    }
  });

  // ── Topbar "+" button handler ──
  if (_topbarHandler) document.removeEventListener('topbar-action', _topbarHandler);
  _topbarHandler = (e) => {
    if (e.detail?.action === 'add-event') {
      // Open today's day modal for quick event add
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      _openDayModal(dateKey);
    }
  };
  document.addEventListener('topbar-action', _topbarHandler);
}

// ═══════════════════════════════════════════════════════════════
// DAY DETAIL MODAL
// ═══════════════════════════════════════════════════════════════

function _openDayModal(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const fullDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Local events (editable)
  const localEvents = _getLocalActivities(dateKey);
  // Google Calendar events (read-only)
  const gcalEvents = gCalEvents[dateKey] || [];

  // Google Cal section
  const gcalHtml = gcalEvents.length > 0 ? `
    <div style="margin-bottom:var(--sp-4)">
      <div style="font-size:12px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--sp-2)">📆 Google Calendar</div>
      ${gcalEvents.map(a => {
        const color = CHIP_COLORS[a.color] || CHIP_COLORS.purple;
        return `<div class="cal-modal-event">
          <span class="cal-modal-dot" style="background:${color}"></span>
          ${a.time ? `<span class="cal-modal-time">${esc(a.time)}</span>` : ''}
          <span class="cal-modal-text">${esc(a.text)}</span>
          <span class="pill pill-purple" style="font-size:9px">GCal</span>
        </div>`;
      }).join('')}
    </div>
  ` : '';

  // Local events section
  const localHtml = localEvents.length > 0 ? localEvents.map((a, i) => {
    const color = CHIP_COLORS[a.color] || CHIP_COLORS.teal;
    return `<div class="cal-modal-event">
      <span class="cal-modal-dot" style="background:${color}"></span>
      ${a.time ? `<span class="cal-modal-time">${esc(a.time)}</span>` : ''}
      <span class="cal-modal-text">${esc(a.text)}</span>
      <button class="btn-danger-icon" data-action="cal-delete-event"
              data-date="${dateKey}" data-idx="${i}" title="Delete">✕</button>
    </div>`;
  }).join('') : '';

  const noEvents = localEvents.length === 0 && gcalEvents.length === 0;
  const emptyHtml = noEvents ? '<p class="empty-hint">No events scheduled</p>' : '';

  // Color options
  const colorOptions = Object.keys(CHIP_COLORS).map(c =>
    `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
  ).join('');

  import('../app.js').then(app => {
    app.openModal(`
      <div style="margin-bottom:var(--sp-4)"><div class="section-title">${fullDate}</div></div>

      ${gcalHtml}

      <div class="cal-modal-events">
        ${localEvents.length > 0 ? `<div style="font-size:12px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--sp-2)">📌 Local Events</div>` : ''}
        ${localHtml}
      </div>

      ${emptyHtml}

      <div class="modal-divider"></div>

      <div class="modal-section-title">Add Event</div>
      <div class="form-group">
        <label class="form-label">Event</label>
        <input class="form-input" type="text" id="cal-evt-text"
               placeholder="What's happening?" autocomplete="off">
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Time <span class="hint">(optional)</span></label>
          <input class="form-input" type="time" id="cal-evt-time">
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <select class="form-input" id="cal-evt-color">${colorOptions}</select>
        </div>
      </div>
      <button class="btn-submit" data-action="cal-save-event" data-date="${dateKey}">
        ✚ Add Event
      </button>
    `);
  });
}

// ═══════════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════════

function _dateKey(year, month, day) {
  const d = new Date(year, month, day);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function _rerender() {
  import('../app.js').then(app => app.renderPage());
}
