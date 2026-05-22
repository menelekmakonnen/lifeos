// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Settings Page
// Profile, exchange rates, sync, data management, about.
// ═══════════════════════════════════════════════════════════════

import { prefs, savePrefs, exportAllData, importAllData, clearAllData, getStorageUsage } from '../data/store.js';
import { checkHealth, syncPull, syncPush, fetchExchangeRates } from '../lib/sync.js';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════

export function renderSettings() {
  const usage = getStorageUsage();
  const usagePct = Math.min((usage.bytes / (5 * 1024 * 1024)) * 100, 100); // 5MB limit
  const hasUrl = !!(prefs.gasUrl && prefs.gasUrl.trim());

  return `
    <div class="page-header fade-in">
      <h1 class="page-title">⚙️ Settings</h1>
      <p class="page-sub">Customize your Life OS experience</p>
    </div>

    <!-- Profile -->
    <div class="card mb-6 fade-in fade-in-delay-1">
      <div class="section-title" style="margin-bottom:var(--sp-5)">👤 Profile</div>
      <div class="form-group">
        <label class="form-label" for="set-name">Display Name</label>
        <input class="form-input" type="text" id="set-name" value="${esc(prefs.name)}" placeholder="Your name">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="set-title">App Title</label>
          <input class="form-input" type="text" id="set-title" value="${esc(prefs.appTitle)}" placeholder="Life OS">
        </div>
        <div class="form-group">
          <label class="form-label" for="set-subtitle">Subtitle</label>
          <input class="form-input" type="text" id="set-subtitle" value="${esc(prefs.subtitle)}" placeholder="Personal Command Centre">
        </div>
      </div>
      <button class="btn btn-primary" data-action="save-profile">💾 Save Profile</button>
    </div>

    <!-- Exchange Rates -->
    <div class="card mb-6 fade-in fade-in-delay-2">
      <div class="section-title" style="margin-bottom:var(--sp-5)">💱 Exchange Rates</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="set-gbp">GBP → USD</label>
          <input class="form-input" type="number" step="0.01" id="set-gbp" value="${prefs.gbpToUsd || 1.27}">
        </div>
        <div class="form-group">
          <label class="form-label" for="set-ghs">GHS → USD</label>
          <input class="form-input" type="number" step="0.0001" id="set-ghs" value="${(prefs.ghsToUsd || 1/16.5).toFixed(4)}">
        </div>
      </div>
      <div style="display:flex;gap:var(--sp-3);align-items:center">
        <button class="btn btn-ghost" data-action="fetch-rates">🔄 Fetch Live Rates</button>
        <button class="btn btn-primary" data-action="save-rates">💾 Save Rates</button>
      </div>
    </div>

    <!-- Google Sheets Sync -->
    <div class="card mb-6 fade-in fade-in-delay-3">
      <div style="display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-5)">
        <div class="section-title">☁️ Google Sheets Sync</div>
        <span style="width:10px;height:10px;border-radius:50%;background:${hasUrl ? 'var(--accent-teal)' : 'var(--text-tertiary)'};flex-shrink:0;box-shadow:${hasUrl ? '0 0 8px var(--accent-teal-glow)' : 'none'}"></span>
        <span style="font-size:12px;color:${hasUrl ? 'var(--accent-teal)' : 'var(--text-tertiary)'}">${hasUrl ? 'Connected' : 'Not configured'}</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="set-gas-url">Web App URL</label>
        <input class="form-input" type="url" id="set-gas-url" value="${esc(prefs.gasUrl)}" placeholder="https://script.google.com/macros/s/.../exec">
        <div class="form-hint">Paste your Apps Script deployment URL</div>
      </div>

      <div class="form-group">
        <label class="form-check">
          <input type="checkbox" id="set-auto-sync" ${prefs.autoSync ? 'checked' : ''}>
          <span>Auto-sync on page load</span>
        </label>
      </div>

      <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap;margin-bottom:var(--sp-4)">
        <button class="btn btn-secondary" data-action="test-sync">🧪 Test Connection</button>
        <button class="btn btn-secondary" data-action="pull-sync">⬇️ Pull Data</button>
        <button class="btn btn-secondary" data-action="push-sync">⬆️ Push Data</button>
        <button class="btn btn-primary" data-action="save-sync">💾 Save Sync Settings</button>
      </div>

      <details>
        <summary>📖 Setup Instructions</summary>
        <div>
          <ol style="padding-left:var(--sp-5);line-height:2">
            <li>Open your Google Spreadsheet</li>
            <li>Go to Extensions → Apps Script</li>
            <li>Paste the LifeOS_Unified.gs code</li>
            <li>Click Deploy → New deployment</li>
            <li>Select "Web app" with "Anyone" access</li>
            <li>Copy the URL and paste it above</li>
          </ol>
        </div>
      </details>
    </div>

    <!-- Data Management -->
    <div class="card mb-6 fade-in fade-in-delay-4">
      <div class="section-title" style="margin-bottom:var(--sp-5)">🗄️ Data Management</div>

      <div style="margin-bottom:var(--sp-5)">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:var(--sp-2)">
          <span class="text-secondary">Local Storage Usage</span>
          <span class="font-mono text-secondary">${usage.display}</span>
        </div>
        <div class="progress" style="height:6px">
          <div class="progress-fill" style="width:${usagePct}%;background:${usagePct > 80 ? 'var(--accent-rose)' : 'var(--accent-blue)'}"></div>
        </div>
        <div class="form-hint">${usage.keys} keys · 5 MB browser limit</div>
      </div>

      <div class="grid-3">
        <div class="card-sm" style="text-align:center;cursor:pointer" data-action="export-data">
          <div style="font-size:28px;margin-bottom:var(--sp-2)">📦</div>
          <div style="font-weight:600;font-size:13px;color:var(--accent-blue)">Export JSON</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:var(--sp-1)">Download backup</div>
        </div>
        <div class="card-sm" style="text-align:center;cursor:pointer" data-action="import-data">
          <div style="font-size:28px;margin-bottom:var(--sp-2)">📥</div>
          <div style="font-weight:600;font-size:13px;color:var(--accent-purple)">Import JSON</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:var(--sp-1)">Restore from file</div>
        </div>
        <div class="card-sm" style="text-align:center;cursor:pointer" data-action="clear-data">
          <div style="font-size:28px;margin-bottom:var(--sp-2)">🗑️</div>
          <div style="font-weight:600;font-size:13px;color:var(--accent-rose)">Clear All</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:var(--sp-1)">Reset everything</div>
        </div>
      </div>
      <input type="file" id="import-file-input" accept=".json" style="display:none">
    </div>

    <!-- About -->
    <div class="card fade-in fade-in-delay-4">
      <div class="section-title" style="margin-bottom:var(--sp-4)">ℹ️ About</div>
      <div style="display:flex;align-items:center;gap:var(--sp-4);margin-bottom:var(--sp-3)">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent-blue),var(--accent-purple));display:grid;place-items:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0">⚡</div>
        <div>
          <div style="font-weight:700;font-size:16px">${esc(prefs.appTitle || 'Life OS')}</div>
          <div class="text-secondary" style="font-size:12px">${esc(prefs.subtitle || 'Personal Command Centre')}</div>
        </div>
      </div>
      <div class="text-secondary" style="font-size:12px;line-height:1.8">
        Version 2026.1 · Built with vanilla JS, CSS, and ❤️<br>
        Glassmorphic dark theme · Inter + Outfit fonts<br>
        Google Sheets backend via Apps Script
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// BIND
// ═══════════════════════════════════════════════════════════════

export function bindSettings(container) {
  container.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    switch (action) {
      case 'save-profile': {
        prefs.name     = container.querySelector('#set-name')?.value || prefs.name;
        prefs.appTitle = container.querySelector('#set-title')?.value || prefs.appTitle;
        prefs.subtitle = container.querySelector('#set-subtitle')?.value || prefs.subtitle;
        savePrefs();
        import('../app.js').then(a => { a.renderPage(); a.toast('Profile saved!', 'success'); });
        break;
      }

      case 'save-rates': {
        prefs.gbpToUsd = parseFloat(container.querySelector('#set-gbp')?.value) || prefs.gbpToUsd;
        prefs.ghsToUsd = parseFloat(container.querySelector('#set-ghs')?.value) || prefs.ghsToUsd;
        savePrefs();
        import('../app.js').then(a => { a.renderPage(); a.toast('Rates saved!', 'success'); });
        break;
      }

      case 'fetch-rates': {
        const orig = el.textContent;
        el.textContent = 'Fetching…';
        el.disabled = true;
        fetchExchangeRates().then(rates => {
          if (rates) {
            prefs.gbpToUsd = rates.gbpToUsd;
            prefs.ghsToUsd = rates.ghsToUsd;
            savePrefs();
            import('../app.js').then(a => { a.renderPage(); a.toast('Live rates updated!', 'success'); });
          }
        }).catch(() => {
          import('../app.js').then(a => a.toast('Failed to fetch rates', 'error'));
        }).finally(() => {
          el.textContent = orig;
          el.disabled = false;
        });
        break;
      }

      case 'save-sync': {
        prefs.gasUrl   = container.querySelector('#set-gas-url')?.value || '';
        prefs.autoSync = container.querySelector('#set-auto-sync')?.checked || false;
        savePrefs();
        import('../app.js').then(a => { a.renderPage(); a.toast('Sync settings saved!', 'success'); });
        break;
      }

      case 'test-sync': {
        el.textContent = 'Testing…';
        el.disabled = true;
        checkHealth().then(ok => {
          import('../app.js').then(a => {
            a.toast(ok ? '✅ Connected!' : '❌ Connection failed', ok ? 'success' : 'error');
          });
        }).finally(() => {
          el.textContent = '🧪 Test Connection';
          el.disabled = false;
        });
        break;
      }

      case 'pull-sync': {
        el.textContent = 'Pulling…';
        el.disabled = true;
        syncPull().then(() => {
          import('../app.js').then(a => { a.renderPage(); a.toast('Data pulled!', 'success'); });
        }).catch(() => {
          import('../app.js').then(a => a.toast('Pull failed', 'error'));
        }).finally(() => {
          el.textContent = '⬇️ Pull Data';
          el.disabled = false;
        });
        break;
      }

      case 'push-sync': {
        el.textContent = 'Pushing…';
        el.disabled = true;
        syncPush().then(() => {
          import('../app.js').then(a => a.toast('Data pushed!', 'success'));
        }).catch(() => {
          import('../app.js').then(a => a.toast('Push failed', 'error'));
        }).finally(() => {
          el.textContent = '⬆️ Push Data';
          el.disabled = false;
        });
        break;
      }

      case 'export-data': {
        const data = exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        import('../app.js').then(app => app.toast('Backup downloaded!', 'success'));
        break;
      }

      case 'import-data': {
        container.querySelector('#import-file-input')?.click();
        break;
      }

      case 'clear-data': {
        import('../app.js').then(app => {
          app.openModal(`
            <div style="margin-bottom:var(--sp-4)">
              <div class="section-title">🗑️ Clear All Data</div>
            </div>
            <p class="text-secondary" style="margin-bottom:var(--sp-4)">
              This will permanently delete all your expenses, tasks, goals, budgets, and settings.
              This cannot be undone.
            </p>
            <div style="display:flex;gap:var(--sp-3);justify-content:flex-end">
              <button class="btn btn-ghost" data-action="modal-cancel">Cancel</button>
              <button class="btn btn-danger" id="confirm-clear">🗑️ Delete Everything</button>
            </div>
          `);
          const modal = document.getElementById('modal-root');
          modal.querySelector('#confirm-clear')?.addEventListener('click', () => {
            clearAllData();
            app.closeModal();
            app.toast('All data cleared', 'success');
            app.renderPage();
          });
          modal.querySelector('[data-action="modal-cancel"]')?.addEventListener('click', () => {
            app.closeModal();
          });
        });
        break;
      }
    }
  });

  // File import handler
  const fileInput = container.querySelector('#import-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          importAllData(data);
          import('../app.js').then(a => { a.renderPage(); a.toast('Data imported!', 'success'); });
        } catch (err) {
          import('../app.js').then(a => a.toast('Invalid JSON file', 'error'));
        }
      };
      reader.readAsText(file);
    });
  }
}
