// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Mobile Bottom Navigation
// Fixed bottom nav bar for screens ≤940px
// ═══════════════════════════════════════════════════════════════

import { state } from '../data/store.js';

const ITEMS = [
  { id: 'overview',  icon: '🏠', label: 'Home' },
  { id: 'finance',   icon: '💰', label: 'Finance' },
  { id: 'expenses',  icon: '💳', label: 'Expenses' },
  { id: 'tasks',     icon: '✅', label: 'Tasks' },
  { id: 'life',      icon: '🌟', label: 'Life' },
  { id: 'more',      icon: '•••', label: 'More' },
];

// Pages accessible from "More" menu
const MORE_PAGES = [
  { id: 'analytics',     icon: '📊', label: 'Analytics' },
  { id: 'budget',        icon: '📋', label: 'Budget' },
  { id: 'wealth',        icon: '💎', label: 'Wealth' },
  { id: 'taskDashboard', icon: '📈', label: 'Task Dashboard' },
  { id: 'calendar',      icon: '📅', label: 'Calendar' },
  { id: 'settings',      icon: '⚙️', label: 'Settings' },
];

let _moreOpen = false;

export function renderMobileNav() {
  // Check if current page is in the MORE_PAGES list (should highlight "More")
  const isMorePage = MORE_PAGES.some(p => p.id === state.currentPage);

  const mainItems = ITEMS.map(item => {
    let active = '';
    if (item.id === 'more') {
      active = isMorePage ? ' active' : '';
    } else {
      active = state.currentPage === item.id ? ' active' : '';
    }
    return `
      <div class="mobile-nav-item${active}" data-action="mobile-nav" data-page="${item.id}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </div>
    `;
  }).join('');

  // More menu (shown when "More" is tapped)
  const moreMenu = _moreOpen ? `
    <div class="mobile-more-menu" id="mobile-more-menu">
      ${MORE_PAGES.map(p => `
        <div class="mobile-more-item${state.currentPage === p.id ? ' active' : ''}" 
             data-action="mobile-nav" data-page="${p.id}">
          <span>${p.icon}</span>
          <span>${p.label}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  return moreMenu + mainItems;
}

export function bindMobileNav(container) {
  container.addEventListener('click', (e) => {
    const item = e.target.closest('[data-action="mobile-nav"]');
    if (!item) return;

    const page = item.dataset.page;
    
    if (page === 'more') {
      _moreOpen = !_moreOpen;
      // Re-render just the mobile nav
      container.innerHTML = renderMobileNav();
      bindMobileNav(container);
      return;
    }
    
    _moreOpen = false;
    import('../app.js').then(app => app.navigate(page));
  });
}
