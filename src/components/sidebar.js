// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Sidebar Component
// Premium glassmorphic sidebar with animated navigation
// ═══════════════════════════════════════════════════════════════

import { state, prefs, exps, goals, tasks } from '../data/store.js';
import { getSyncStatus } from '../lib/sync.js';

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Navigation Structure ────────────────────────────────────
const NAV_SECTIONS = [
  {
    title: 'HOME',
    items: [
      { id: 'overview',  icon: '🏠', label: 'Overview' },
      { id: 'analytics', icon: '📊', label: 'Analytics' },
    ]
  },
  {
    title: 'FINANCE',
    items: [
      { id: 'finance',  icon: '💰', label: 'Finance Hub' },
      { id: 'expenses', icon: '💳', label: 'Expenses',   badge: () => countExpenses() },
      { id: 'budget',   icon: '📋', label: 'Budget' },
      { id: 'wealth',   icon: '💎', label: 'Wealth',     badge: () => goals.length },
    ]
  },
  {
    title: 'TASKS',
    items: [
      { id: 'taskDashboard', icon: '📈', label: 'Dashboard' },
      { id: 'tasks',         icon: '✅', label: 'All Tasks', badge: () => activeTasks() },
    ]
  },
  {
    title: 'DAILY LIFE',
    items: [
      { id: 'calendar', icon: '📅', label: 'Calendar' },
      { id: 'life',     icon: '🌟', label: 'Life Hub' },
    ]
  },
];

function countExpenses() {
  const curr = state.expCurr || 'ghs';
  return (exps[curr] || []).filter(e => e.month === state.selectedMonth).length || 0;
}

function activeTasks() {
  return (tasks || []).filter(t => t.status !== 'Done').length;
}

// ── Render ──────────────────────────────────────────────────
export function renderSidebar() {
  const sync = getSyncStatus();
  const initial = (prefs.name || 'U')[0].toUpperCase();
  
  return `
    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="sidebar-logo">${initial}</div>
      <div>
        <div class="sidebar-title">${esc(prefs.appTitle || 'Life OS')}</div>
        <div class="sidebar-tag">${esc(prefs.subtitle || 'Personal Command Centre')}</div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      ${NAV_SECTIONS.map(section => `
        <div class="sidebar-section">
          <div class="sidebar-section-title">${section.title}</div>
          ${section.items.map(item => {
            const active = state.currentPage === item.id ? ' active' : '';
            const badgeVal = item.badge ? item.badge() : null;
            const badge = badgeVal ? `<span class="nav-badge">${badgeVal}</span>` : '';
            return `
              <div class="nav-item${active}" data-action="nav" data-page="${item.id}">
                <span class="nav-icon">${item.icon}</span>
                <span>${item.label}</span>
                ${badge}
              </div>`;
          }).join('')}
        </div>
      `).join('')}
    </nav>

    <!-- Footer -->
    <div class="sidebar-footer">
      <div class="nav-item${state.currentPage === 'settings' ? ' active' : ''}" data-action="nav" data-page="settings" style="flex:1">
        <span class="nav-icon">⚙️</span>
        <span>Settings</span>
      </div>
    </div>
    <div class="sidebar-footer" style="border-top:none;padding-top:0;">
      <span class="sync-dot ${sync.status === 'syncing' ? 'syncing' : prefs.gasUrl ? 'online' : 'offline'}"></span>
      <span>${prefs.gasUrl ? (sync.status === 'syncing' ? 'Syncing…' : 'Cloud Connected') : 'Local Storage'}</span>
    </div>
  `;
}

// ── Bind Events ─────────────────────────────────────────────
export function bindSidebar(container) {
  container.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-action="nav"]');
    if (navItem) {
      const page = navItem.dataset.page;
      if (page) {
        // Import navigate dynamically to avoid circular dependency
        import('../app.js').then(app => app.navigate(page));
      }
    }
  });
}
