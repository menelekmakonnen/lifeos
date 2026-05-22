// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Notes Sidebar Component
// Right-edge pocket drawer for page-specific feedback notes.
// Notes persist in localStorage, keyed by page name.
// ═══════════════════════════════════════════════════════════════

import { state } from '../data/store.js';

const STORAGE_KEY = 'los_page_notes';

// ── Helpers ────────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getAllNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveAllNotes(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getPageNotes(page) {
  return getAllNotes()[page] || [];
}

function addNote(page, text) {
  const all = getAllNotes();
  if (!all[page]) all[page] = [];
  all[page].push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    timestamp: new Date().toISOString(),
  });
  saveAllNotes(all);
}

function deleteNote(page, noteId) {
  const all = getAllNotes();
  if (all[page]) {
    all[page] = all[page].filter(n => n.id !== noteId);
    if (all[page].length === 0) delete all[page];
    saveAllNotes(all);
  }
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── State ──────────────────────────────────────────────────
let _open = false;
let _container = null;

// ── Render ─────────────────────────────────────────────────
function renderNotesList() {
  const page = state.currentPage;
  const notes = getPageNotes(page);
  const count = notes.length;

  // Update the badge on the tab handle
  const badge = _container?.querySelector('.notes-tab-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  const list = _container?.querySelector('.notes-list');
  if (!list) return;

  if (notes.length === 0) {
    list.innerHTML = `
      <div class="notes-empty">
        <div style="font-size:32px;margin-bottom:8px;opacity:0.4">📝</div>
        <div style="font-size:13px;color:var(--text-tertiary)">No notes for this page yet.</div>
        <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">Leave feedback about what you'd like changed.</div>
      </div>`;
    return;
  }

  list.innerHTML = notes.map(n => `
    <div class="note-card" data-note-id="${n.id}">
      <div class="note-card-header">
        <span class="note-time">${formatTime(n.timestamp)}</span>
        <button class="note-delete" data-action="delete-note" data-note-id="${n.id}" title="Delete note">×</button>
      </div>
      <div class="note-card-body">${esc(n.text)}</div>
    </div>
  `).join('');
}

// ── Init ───────────────────────────────────────────────────
export function initNotesSidebar() {
  _container = document.getElementById('notes-sidebar');
  if (!_container) return;

  // Build the initial HTML inside the container
  _container.innerHTML = `
    <div class="notes-tab" id="notes-tab" title="Page Notes">
      <span class="notes-tab-icon">📝</span>
      <span class="notes-tab-badge" style="display:none">0</span>
    </div>
    <div class="notes-drawer" id="notes-drawer">
      <div class="notes-header">
        <div class="notes-header-title">📝 Page Notes</div>
        <div class="notes-header-page" id="notes-page-label"></div>
      </div>
      <div class="notes-list" id="notes-list"></div>
      <div class="notes-compose">
        <textarea class="notes-input" id="notes-input" placeholder="Type your feedback for this page…" rows="3"></textarea>
        <button class="notes-send" id="notes-send" data-action="send-note">Save Note</button>
      </div>
    </div>
  `;

  // Toggle drawer
  _container.querySelector('#notes-tab').addEventListener('click', () => {
    _open = !_open;
    _container.classList.toggle('open', _open);
    if (_open) {
      refreshNotesView();
      _container.querySelector('#notes-input')?.focus();
    }
  });

  // Event delegation inside drawer
  _container.querySelector('#notes-drawer').addEventListener('click', (e) => {
    const del = e.target.closest('[data-action="delete-note"]');
    if (del) {
      deleteNote(state.currentPage, del.dataset.noteId);
      renderNotesList();
      return;
    }

    const send = e.target.closest('[data-action="send-note"]');
    if (send) {
      submitNote();
    }
  });

  // Ctrl+Enter to submit
  _container.querySelector('#notes-input').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submitNote();
    }
  });

  refreshNotesView();
}

function submitNote() {
  const input = _container.querySelector('#notes-input');
  const text = input?.value.trim();
  if (!text) return;
  addNote(state.currentPage, text);
  input.value = '';
  renderNotesList();
}

// ── Refresh (call on page nav) ─────────────────────────────
export function refreshNotesView() {
  if (!_container) return;
  const PAGE_NAMES = {
    overview: 'Overview', analytics: 'Analytics', finance: 'Finance Hub',
    expenses: 'Expenses', budget: 'Budget', wealth: 'Wealth',
    taskDashboard: 'Task Dashboard', tasks: 'All Tasks',
    calendar: 'Calendar', life: 'Life Hub', settings: 'Settings',
  };
  const label = _container.querySelector('#notes-page-label');
  if (label) label.textContent = PAGE_NAMES[state.currentPage] || state.currentPage;
  renderNotesList();
}
