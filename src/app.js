// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Main Application Controller
// Handles routing, rendering, event delegation, modals, toasts.
//
// ARCHITECTURE NOTES:
//   - render()     → full re-render (shell + page + bind)
//   - renderPage() → content-only re-render (page + bind only)
//     Pages must call renderPage() NOT render() to avoid loops.
//   - A render guard prevents re-entrant / recursive calls.
// ═══════════════════════════════════════════════════════════════

import { state, initData, prefs, savePrefs, saveSelectedMonth } from './data/store.js';
import { getAllMonths, getCurrentMonthKey } from './lib/utils.js';
import { fetchExchangeRates } from './lib/sync.js';
import { renderSidebar, bindSidebar } from './components/sidebar.js';
import { renderTopbar, bindTopbar } from './components/topbar.js';
import { renderMobileNav, bindMobileNav } from './components/mobileNav.js';
import { renderOverview, bindOverview } from './pages/overview.js';
import { renderFinance, bindFinance } from './pages/finance.js';
import { renderExpenses, bindExpenses } from './pages/expenses.js';
import { renderBudget, bindBudget } from './pages/budget.js';
import { renderWealth, bindWealth } from './pages/wealth.js';
import { renderCalendar, bindCalendar } from './pages/calendar.js';
import { renderLife, bindLife } from './pages/life.js';
import { renderAnalytics, bindAnalytics } from './pages/analytics.js';
import { renderTaskDashboard, bindTaskDashboard } from './pages/taskDashboard.js';
import { renderTasks, bindTasks } from './pages/tasks.js';
import { renderSettings, bindSettings } from './pages/settings.js';

// ── Page Registry ──────────────────────────────────────────
const PAGES = {
  overview:      { render: renderOverview,      bind: bindOverview,      title: 'Overview',       section: 'HOME',    icon: '🏠' },
  analytics:     { render: renderAnalytics,     bind: bindAnalytics,     title: 'Analytics',      section: 'HOME',    icon: '📊' },
  finance:       { render: renderFinance,       bind: bindFinance,       title: 'Finance Hub',    section: 'FINANCE', icon: '💰' },
  expenses:      { render: renderExpenses,      bind: bindExpenses,      title: 'Expenses',       section: 'FINANCE', icon: '💳' },
  budget:        { render: renderBudget,        bind: bindBudget,        title: 'Budget',         section: 'FINANCE', icon: '📋' },
  wealth:        { render: renderWealth,        bind: bindWealth,        title: 'Wealth',         section: 'FINANCE', icon: '💎' },
  taskDashboard: { render: renderTaskDashboard, bind: bindTaskDashboard, title: 'Task Dashboard', section: 'TASKS',   icon: '📈' },
  tasks:         { render: renderTasks,         bind: bindTasks,         title: 'All Tasks',      section: 'TASKS',   icon: '✅' },
  calendar:      { render: renderCalendar,      bind: bindCalendar,      title: 'Calendar',       section: 'LIFE',    icon: '📅' },
  life:          { render: renderLife,          bind: bindLife,          title: 'Life Hub',       section: 'LIFE',    icon: '🌟' },
  settings:      { render: renderSettings,      bind: bindSettings,      title: 'Settings',       section: 'META',    icon: '⚙️' },
};

// ── Initialize ─────────────────────────────────────────────
initData();

// ── Toast System ───────────────────────────────────────────
export function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  if (type === 'error')   el.style.borderLeft = '3px solid var(--accent-rose)';
  if (type === 'success') el.style.borderLeft = '3px solid var(--accent-teal)';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ── Modal System ───────────────────────────────────────────
export function openModal(html, cls = '') {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" id="modal-overlay">
    <div class="modal ${cls}" id="modal-body">${html}</div>
  </div>`;
  
  root.querySelector('.modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  
  requestAnimationFrame(() => {
    const firstInput = root.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  });
}

export function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// ESC closes modal / spotlight
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('modal-root');
    if (modal && modal.innerHTML) { closeModal(); return; }
    const spotlight = document.getElementById('spotlight-root');
    if (spotlight && spotlight.innerHTML) closeSpotlight();
  }
});

// ── Spotlight Search ───────────────────────────────────────
export function openSpotlight() {
  state.searchOpen = true;
  const root = document.getElementById('spotlight-root');
  root.innerHTML = `<div class="modal-overlay" id="spotlight-overlay">
    <div class="spotlight">
      <input type="text" class="spotlight-input" id="spotlight-input"
             placeholder="Search expenses, tasks, goals…" autocomplete="off">
      <div class="spotlight-results" id="spotlight-results"></div>
    </div>
  </div>`;
  
  root.querySelector('.modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSpotlight();
  });
  
  const input = document.getElementById('spotlight-input');
  input.focus();
  input.addEventListener('input', (e) => handleSearch(e.target.value));
}

export function closeSpotlight() {
  state.searchOpen = false;
  document.getElementById('spotlight-root').innerHTML = '';
}

function handleSearch(query) {
  const results = document.getElementById('spotlight-results');
  if (!query.trim()) {
    results.innerHTML = `<div class="spotlight-item" style="justify-content:center;color:var(--text-tertiary);font-size:13px;">
      Type to search across expenses, tasks, goals, and more…
    </div>`;
    return;
  }
  
  const q = query.toLowerCase();
  const items = [];
  
  Object.entries(PAGES).forEach(([key, page]) => {
    if (page.title.toLowerCase().includes(q)) {
      items.push({ icon: page.icon, label: page.title, hint: page.section, action: `nav:${key}` });
    }
  });
  
  import('./data/store.js').then(store => {
    (store.tasks || []).forEach(t => {
      if (t.title && t.title.toLowerCase().includes(q))
        items.push({ icon: '✅', label: t.title, hint: 'Task', action: 'nav:tasks' });
    });
    (store.goals || []).forEach(g => {
      if (g.n && g.n.toLowerCase().includes(q))
        items.push({ icon: '🎯', label: g.n, hint: 'Goal', action: 'nav:wealth' });
    });
    ['ghs', 'usd', 'gbp'].forEach(curr => {
      (store.exps[curr] || []).forEach(e => {
        if ((e.description && e.description.toLowerCase().includes(q)) ||
            (e.category && e.category.toLowerCase().includes(q)))
          items.push({ icon: '💳', label: e.description || e.category, hint: curr.toUpperCase(), action: 'nav:expenses' });
      });
    });
    
    const shown = items.slice(0, 8);
    if (shown.length === 0) {
      results.innerHTML = `<div class="spotlight-item" style="justify-content:center;color:var(--text-tertiary);font-size:13px;">
        No results for "${escapeHtml(query)}"
      </div>`;
    } else {
      results.innerHTML = shown.map(item => `
        <div class="spotlight-item" data-action="spotlight-go" data-target="${item.action}">
          <span class="spot-icon">${item.icon}</span>
          <span class="spot-label">${escapeHtml(item.label)}</span>
          <span class="spot-hint">${item.hint}</span>
        </div>
      `).join('');
    }
  });
}

// Cmd+K / Ctrl+K opens spotlight
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (state.searchOpen) closeSpotlight();
    else openSpotlight();
  }
});

// ── Navigation ─────────────────────────────────────────────
export function navigate(page) {
  if (!PAGES[page]) page = 'overview';
  state.currentPage = page;
  render();
  const content = document.getElementById('content');
  if (content) content.scrollTop = 0;
  
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ── Month Navigation ───────────────────────────────────────
export function prevMonth() {
  const months = getAllMonths();
  const idx = months.indexOf(state.selectedMonth);
  if (idx > 0) {
    state.selectedMonth = months[idx - 1];
    saveSelectedMonth();
    render();
  }
}

export function nextMonth() {
  const months = getAllMonths();
  const idx = months.indexOf(state.selectedMonth);
  if (idx < months.length - 1) {
    state.selectedMonth = months[idx + 1];
    saveSelectedMonth();
    render();
  }
}


// ═══════════════════════════════════════════════════════════════
// RENDER SYSTEM
// ═══════════════════════════════════════════════════════════════

let _rendering = false;    // Guard against re-entrant render
let _renderRAF = null;     // Debounce RAF handle

/**
 * Full render — shell + page + event binding.
 * Protected against infinite re-render loops.
 */
export function render() {
  if (_rendering) return;   // ← GUARD: prevents re-entrant calls
  _rendering = true;
  
  try {
    const sidebar   = document.getElementById('sidebar');
    const topbar    = document.getElementById('topbar');
    const mobileNav = document.getElementById('mobile-nav');
    const content   = document.getElementById('content');
    
    // Render shell
    sidebar.innerHTML   = renderSidebar();
    topbar.innerHTML    = renderTopbar();
    mobileNav.innerHTML = renderMobileNav();
    
    // Render page
    const page = PAGES[state.currentPage] || PAGES.overview;
    content.innerHTML = page.render();
    
    // Bind event handlers
    bindSidebar(sidebar);
    bindTopbar(topbar);
    bindMobileNav(mobileNav);
    if (page.bind) page.bind(content);
    
    // Update title
    document.title = `${page.title} — ${prefs.appTitle || 'Life OS'}`;
  } finally {
    _rendering = false;    // ← Always release the guard
  }
}

/**
 * Content-only render — re-renders just the page content + bind.
 * Pages should call THIS instead of render() after state changes.
 * This avoids re-rendering sidebar/topbar and prevents loops.
 */
export function renderPage() {
  if (_rendering) return;
  _rendering = true;
  
  try {
    const content = document.getElementById('content');
    const page = PAGES[state.currentPage] || PAGES.overview;
    content.innerHTML = page.render();
    if (page.bind) page.bind(content);
  } finally {
    _rendering = false;
  }
}

/**
 * Debounced render — for use as a subscribe() callback.
 * Coalesces multiple rapid notify() calls into a single render.
 */
export function debouncedRender() {
  if (_renderRAF) cancelAnimationFrame(_renderRAF);
  _renderRAF = requestAnimationFrame(() => {
    _renderRAF = null;
    renderPage();
  });
}

// ── Sidebar Toggle (mobile) ───────────────────────────────
export function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}

document.getElementById('sidebar-overlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
});

// ── Global event delegation ────────────────────────────────
document.addEventListener('click', (e) => {
  // Spotlight navigation
  const spotItem = e.target.closest('[data-action="spotlight-go"]');
  if (spotItem) {
    const target = spotItem.dataset.target;
    if (target && target.startsWith('nav:')) {
      navigate(target.replace('nav:', ''));
      closeSpotlight();
    }
    return;
  }

  // Global close-modal — modals render in #modal-root outside page containers,
  // so page-level event delegation can't catch these clicks
  const closeBtn = e.target.closest('[data-action="close-modal"]');
  if (closeBtn) {
    closeModal();
    return;
  }
});

// ── HTML Escape Helper ─────────────────────────────────────
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Convenience export for pages ───────────────────────────
export function getPageInfo() {
  return PAGES[state.currentPage] || PAGES.overview;
}

// ── Boot ───────────────────────────────────────────────────
render();

// Fetch live exchange rates in background (non-blocking)
fetchExchangeRates().catch(() => {});

console.log(
  '%c⚡ Life OS',
  'font-size:20px;font-weight:800;color:#6b8afd;'
);
