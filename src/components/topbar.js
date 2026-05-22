// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Topbar Component
// Sticky header with breadcrumb, search, month nav, quick actions
// ═══════════════════════════════════════════════════════════════

import { state, prefs } from '../data/store.js';

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Page metadata for breadcrumbs ───────────────────────────
const PAGE_META = {
  overview:      { section: 'Home',    title: 'Overview' },
  analytics:     { section: 'Home',    title: 'Analytics' },
  finance:       { section: 'Finance', title: 'Finance Hub' },
  expenses:      { section: 'Finance', title: 'Expenses' },
  budget:        { section: 'Finance', title: 'Budget' },
  wealth:        { section: 'Finance', title: 'Wealth' },
  taskDashboard: { section: 'Tasks',   title: 'Dashboard' },
  tasks:         { section: 'Tasks',   title: 'All Tasks' },
  calendar:      { section: 'Life',    title: 'Calendar' },
  life:          { section: 'Life',    title: 'Life Hub' },
  settings:      { section: 'System',  title: 'Settings' },
};

// ── Context-aware Add button labels ─────────────────────────
function getAddAction() {
  switch (state.currentPage) {
    case 'expenses': case 'finance':
      return { label: 'Expense', action: 'add-expense' };
    case 'wealth':
      return { label: 'Entry', action: 'add-wealth' };
    case 'tasks': case 'taskDashboard':
      return { label: 'Task', action: 'add-task' };
    case 'calendar':
      return { label: 'Event', action: 'add-event' };
    case 'budget':
      return { label: 'Expense', action: 'add-expense' };
    default:
      return { label: 'New', action: 'add-quick' };
  }
}

// ── Render ──────────────────────────────────────────────────
export function renderTopbar() {
  const meta = PAGE_META[state.currentPage] || PAGE_META.overview;
  const add = getAddAction();
  const initial = (prefs.name || 'U')[0].toUpperCase();

  return `
    <!-- Hamburger (mobile) -->
    <button class="topbar-hamburger" data-action="toggle-sidebar" aria-label="Menu">☰</button>

    <!-- Breadcrumb -->
    <div class="topbar-breadcrumb">
      <span>${esc(meta.section)}</span>
      <span style="opacity:0.3">›</span>
      <span class="current">${esc(meta.title)}</span>
    </div>

    <!-- Search -->
    <div class="topbar-search">
      <span class="search-icon">🔍</span>
      <input type="text" placeholder="Search…" data-action="open-search" readonly>
      <span class="search-kbd">⌘K</span>
    </div>

    <!-- Actions -->
    <div class="topbar-actions">
      <!-- Month Navigator -->
      <div class="topbar-month">
        <button data-action="prev-month" aria-label="Previous month">◂</button>
        <span>${esc(state.selectedMonth)}</span>
        <button data-action="next-month" aria-label="Next month">▸</button>
      </div>

      <!-- Add Button -->
      <button class="btn-add" data-action="${add.action}">
        <span>+</span>
        <span>${add.label}</span>
      </button>

      <!-- Avatar -->
      <div class="topbar-avatar" data-action="nav-settings" title="Settings">${initial}</div>
    </div>
  `;
}

// ── Bind Events ─────────────────────────────────────────────
export function bindTopbar(container) {
  container.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;
    
    switch (action) {
      case 'toggle-sidebar':
        import('../app.js').then(app => app.toggleSidebar());
        break;
        
      case 'open-search':
        import('../app.js').then(app => app.openSpotlight());
        break;
        
      case 'prev-month':
        import('../app.js').then(app => app.prevMonth());
        break;
        
      case 'next-month':
        import('../app.js').then(app => app.nextMonth());
        break;
        
      case 'nav-settings':
        import('../app.js').then(app => app.navigate('settings'));
        break;
        
      // ── Add actions: navigate to the right page + trigger add ──
      case 'add-expense':
        import('../app.js').then(app => {
          if (state.currentPage !== 'expenses') app.navigate('expenses');
          setTimeout(() => document.dispatchEvent(new CustomEvent('topbar-action', { detail: { action } })), 50);
        });
        break;

      case 'add-wealth':
        import('../app.js').then(app => {
          if (state.currentPage !== 'wealth') app.navigate('wealth');
          setTimeout(() => document.dispatchEvent(new CustomEvent('topbar-action', { detail: { action } })), 50);
        });
        break;

      case 'add-task':
        import('../app.js').then(app => {
          if (state.currentPage !== 'tasks') app.navigate('tasks');
          setTimeout(() => document.dispatchEvent(new CustomEvent('topbar-action', { detail: { action } })), 50);
        });
        break;

      case 'add-event':
        import('../app.js').then(app => {
          if (state.currentPage !== 'calendar') app.navigate('calendar');
          setTimeout(() => document.dispatchEvent(new CustomEvent('topbar-action', { detail: { action } })), 50);
        });
        break;

      case 'add-quick':
        // On generic pages, open a quick-add menu
        import('../app.js').then(app => {
          app.openModal(`
            <div style="margin-bottom:var(--sp-4)"><div class="section-title">✨ Quick Add</div></div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-3)">
              <button class="card-sm" style="cursor:pointer;text-align:center" data-action="quick-nav" data-page="expenses">💳 Expense</button>
              <button class="card-sm" style="cursor:pointer;text-align:center" data-action="quick-nav" data-page="tasks">✅ Task</button>
              <button class="card-sm" style="cursor:pointer;text-align:center" data-action="quick-nav" data-page="wealth">💎 Wealth</button>
              <button class="card-sm" style="cursor:pointer;text-align:center" data-action="quick-nav" data-page="calendar">📅 Event</button>
            </div>
          `);
          const modal = document.getElementById('modal-root');
          modal.addEventListener('click', (ev) => {
            const btn = ev.target.closest('[data-action="quick-nav"]');
            if (btn) {
              const page = btn.dataset.page;
              app.closeModal();
              app.navigate(page);
              const addMap = { expenses: 'add-expense', tasks: 'add-task', wealth: 'add-wealth', calendar: 'add-event' };
              setTimeout(() => document.dispatchEvent(new CustomEvent('topbar-action', { detail: { action: addMap[page] } })), 100);
            }
          });
        });
        break;
    }
  });
}
