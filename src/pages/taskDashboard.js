// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Task Dashboard
// Overview page showing task statistics across roles, role cards
// with completion progress, and an upcoming-tasks feed.
// ═══════════════════════════════════════════════════════════════

import { state, prefs, tasks } from '../data/store.js';
import { greet, formatDate, isOverdue, isToday, daysUntil } from '../lib/utils.js';
import { ROLES } from '../data/seedData.js';

let _topbarHandler = null;


// ── HTML Escaping ───────────────────────────────────────────
/** Escape user-provided strings for safe insertion into HTML */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ═══════════════════════════════════════════════════════════════
// RENDER
// Returns the full HTML for the Task Dashboard page.
// ═══════════════════════════════════════════════════════════════

export function renderTaskDashboard() {
  const userName = prefs.name || 'there';
  const today = new Date().toISOString().slice(0, 10);

  // ── Aggregate task statistics ──
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === 'Done').length;
  const inProg    = tasks.filter(t => t.status === 'In Progress').length;
  const overdue   = tasks.filter(t => t.status !== 'Done' && isOverdue(t.due)).length;
  const compRate  = total > 0 ? Math.round((completed / total) * 100) : 0;

  // ── Build role cards ──
  const roleCardsHtml = ROLES.map(role => {
    const roleTasks = tasks.filter(t => t.role === role.id);
    const rTotal    = roleTasks.length;
    const rDone     = roleTasks.filter(t => t.status === 'Done').length;
    const rActive   = roleTasks.filter(t => t.status !== 'Done').length;
    const rUrgent   = roleTasks.filter(t =>
      t.status !== 'Done' && (t.priority === 'High' || isOverdue(t.due))
    ).length;
    const rPct      = rTotal > 0 ? Math.round((rDone / rTotal) * 100) : 0;

    return `
      <div class="card role-card fade-in"
           data-action="goto-role" data-role="${esc(role.id)}"
           style="cursor:pointer; position:relative; border-top: 3px solid ${role.color};">
        <!-- Role header -->
        <div style="display:flex; align-items:center; gap:var(--sp-2); margin-bottom:var(--sp-3);">
          <span style="font-size:22px;">${role.emoji}</span>
          <div>
            <div style="font-weight:600; font-size:14px; color:var(--text-primary);">${esc(role.name)}</div>
            ${role.org ? `<div style="font-size:11px; color:var(--text-tertiary);">${esc(role.org)}</div>` : ''}
          </div>
        </div>

        <!-- Role stats row -->
        <div style="display:flex; gap:var(--sp-4); margin-bottom:var(--sp-3);">
          <div style="text-align:center;">
            <div style="font-size:18px; font-family:'Outfit',sans-serif; font-weight:700; color:var(--accent-blue);">${rActive}</div>
            <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px;">Active</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:18px; font-family:'Outfit',sans-serif; font-weight:700; color:var(--accent-teal);">${rDone}</div>
            <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px;">Done</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:18px; font-family:'Outfit',sans-serif; font-weight:700; color:${rUrgent > 0 ? 'var(--accent-rose)' : 'var(--text-tertiary)'};">${rUrgent}</div>
            <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px;">Urgent</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div style="display:flex; align-items:center; gap:var(--sp-2);">
          <div class="progress" style="flex:1;">
            <div class="progress-fill" style="width:${rPct}%; background:${role.color};"></div>
          </div>
          <span style="font-size:11px; font-weight:600; color:var(--text-secondary); min-width:32px; text-align:right;">${rPct}%</span>
        </div>
      </div>
    `;
  }).join('');

  // ── Build upcoming tasks list (next 8 by due date, not done) ──
  const upcoming = tasks
    .filter(t => t.status !== 'Done' && t.due)
    .sort((a, b) => {
      // Overdue first, then by due date ascending
      const aOD = isOverdue(a.due) ? 0 : 1;
      const bOD = isOverdue(b.due) ? 0 : 1;
      if (aOD !== bOD) return aOD - bOD;
      return a.due.localeCompare(b.due);
    })
    .slice(0, 8);

  const upcomingHtml = upcoming.length > 0
    ? upcoming.map(t => {
        const role = ROLES.find(r => r.id === t.role);
        const dueDateClass = isOverdue(t.due) ? 'overdue' : isToday(t.due) ? 'today' : 'upcoming';
        const priorityClass = t.priority === 'High' ? 'pill-rose'
                            : t.priority === 'Medium' ? 'pill-gold'
                            : 'pill-teal';
        const isDone = t.status === 'Done';

        return `
          <div class="task-card fade-in" style="margin-bottom:var(--sp-3);"
               data-action="goto-tasks">
            <div class="task-checkbox">
              <label class="checkbox-wrap">
                <input type="checkbox" ${isDone ? 'checked' : ''}
                       data-action="toggle-dash-task" data-id="${esc(t.id)}">
              </label>
            </div>
            <div class="task-body">
              <div class="task-title ${isDone ? 'done' : ''}">${esc(t.title)}</div>
              <div class="task-meta">
                <span class="pill ${priorityClass}">${esc(t.priority)}</span>
                ${role ? `<span class="pill pill-muted">${role.emoji} ${esc(role.name)}</span>` : ''}
                <span class="task-due ${dueDateClass}">${formatDate(t.due)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')
    : `<div class="empty-state">
         <div class="empty-icon">🎉</div>
         <div class="empty-title">All caught up!</div>
         <div class="empty-desc">No upcoming tasks right now.</div>
       </div>`;


  // ── Full page layout ──
  return `
    <!-- Greeting -->
    <div class="page-header mb-6">
      <div class="greeting">${greet(userName)} 👋</div>
      <div class="page-subtitle">Here's your task overview</div>
    </div>

    <!-- Stat Cards -->
    <div class="grid-4 mb-6">
      <div class="card stat-card fade-in" style="cursor:pointer" data-action="goto-tasks">
        <div class="stat-label">Total Tasks</div>
        <div class="stat-value">${total}</div>
        <div class="stat-sub">across all roles</div>
      </div>
      <div class="card stat-card fade-in fade-in-delay-1" style="cursor:pointer" data-action="goto-tasks-done">
        <div class="stat-label">Completed</div>
        <div class="stat-value" style="color:var(--accent-teal);">${completed}</div>
        <div class="stat-trend up">▲ ${compRate}% completion rate</div>
      </div>
      <div class="card stat-card fade-in fade-in-delay-2" style="cursor:pointer" data-action="goto-tasks-progress">
        <div class="stat-label">In Progress</div>
        <div class="stat-value" style="color:var(--accent-blue);">${inProg}</div>
        <div class="stat-sub">actively working</div>
      </div>
      <div class="card stat-card fade-in fade-in-delay-3" style="cursor:pointer" data-action="goto-tasks-overdue">
        <div class="stat-label">Overdue</div>
        <div class="stat-value" style="color:${overdue > 0 ? 'var(--accent-rose)' : 'var(--text-tertiary)'}">${overdue}</div>
        <div class="stat-sub">${overdue > 0 ? 'need attention' : 'you\'re on track'}</div>
      </div>
    </div>

    <!-- Role Cards -->
    <div class="section-header">
      <div>
        <div class="section-title">Roles</div>
        <div class="section-subtitle">Task breakdown by life domain</div>
      </div>
    </div>
    <div class="grid-auto mb-6" style="grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));">
      ${roleCardsHtml}
    </div>

    <!-- Upcoming Tasks -->
    <div class="section-header">
      <div>
        <div class="section-title">Upcoming Tasks</div>
        <div class="section-subtitle">Next tasks by due date</div>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="goto-tasks">View All →</button>
    </div>
    <div class="mb-6">
      ${upcomingHtml}
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════
// BIND
// Attaches event delegation to the rendered dashboard container.
// ═══════════════════════════════════════════════════════════════

export function bindTaskDashboard(container) {

  // ── Click delegation ──
  container.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;

    switch (action) {

      // Navigate to the full tasks page (optionally filtered by role)
      case 'goto-role': {
        const roleId = el.dataset.role;
        // Pre-set the role filter so the tasks page opens filtered
        state.taskFilters = {
          role: roleId || '',
          priority: '',
          status: '',
          workType: '',
          search: '',
        };
        import('../app.js').then(app => app.navigate('tasks'));
        break;
      }

      // Navigate to tasks page (no filter)
      case 'goto-tasks': {
        state.taskFilters = { role: '', priority: '', status: '', workType: '', search: '' };
        import('../app.js').then(app => app.navigate('tasks'));
        break;
      }

      // Navigate to tasks filtered by status
      case 'goto-tasks-done': {
        state.taskFilters = { role: '', priority: '', status: 'Done', workType: '', search: '' };
        import('../app.js').then(app => app.navigate('tasks'));
        break;
      }
      case 'goto-tasks-progress': {
        state.taskFilters = { role: '', priority: '', status: 'In Progress', workType: '', search: '' };
        import('../app.js').then(app => app.navigate('tasks'));
        break;
      }
      case 'goto-tasks-overdue': {
        state.taskFilters = { role: '', priority: 'High', status: '', workType: '', search: '' };
        import('../app.js').then(app => app.navigate('tasks'));
        break;
      }

      // Toggle a task's completion status from the dashboard
      case 'toggle-dash-task': {
        e.stopPropagation(); // prevent card click from firing
        const taskId = el.dataset.id || e.target.closest('[data-id]')?.dataset.id;
        if (!taskId) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Toggle between Done ↔ To Do
        if (task.status === 'Done') {
          task.status = 'To Do';
          task.completed = null;
        } else {
          task.status = 'Done';
          task.completed = new Date().toISOString();
        }

        // Persist and re-render
        import('../data/store.js').then(store => {
          store.saveTasks();
          import('../app.js').then(app => {
            app.toast(task.status === 'Done' ? '✓ Task completed' : '↩ Task reopened', 'success');
          });
        });
        break;
      }
    }
  });

  // ── Listen for topbar "Add Task" button ──
  if (_topbarHandler) document.removeEventListener('topbar-action', _topbarHandler);
  _topbarHandler = (e) => {
    if (e.detail?.action === 'add-task') {
      import('../app.js').then(app => app.navigate('tasks'));
    }
  };
  document.addEventListener('topbar-action', _topbarHandler);
}
