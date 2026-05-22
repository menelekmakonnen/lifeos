// ═══════════════════════════════════════════════════════════════
// LIFE OS 2026 — Full Task Manager
// List + Kanban board views, multi-dimensional filtering,
// complete CRUD with subtasks, recurrence, and delegation.
// ═══════════════════════════════════════════════════════════════

import { state, tasks, saveTasks } from '../data/store.js';
import { generateId, formatDate, isOverdue, isToday, daysUntil } from '../lib/utils.js';
import { ROLES, WORK_TYPES, PRIORITIES, STATUSES } from '../data/seedData.js';

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


// ── Recurrence options ──────────────────────────────────────
const RECURRENCES = [
  { id: 'none',      label: 'None' },
  { id: 'daily',     label: 'Daily' },
  { id: 'weekly',    label: 'Weekly' },
  { id: 'biweekly',  label: 'Bi-weekly' },
  { id: 'monthly',   label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'annually',  label: 'Annually' },
];


// ═══════════════════════════════════════════════════════════════
// FILTERING
// Applies all active filters (AND logic) to the master task list.
// ═══════════════════════════════════════════════════════════════

function getFilteredTasks() {
  const f = state.taskFilters;
  return tasks.filter(t => {
    if (f.role     && t.role !== f.role)         return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.status   && t.status !== f.status)     return false;
    if (f.workType && t.workType !== f.workType) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      const notesMatch = (t.desc || '').toLowerCase().includes(q);
      if (!titleMatch && !notesMatch) return false;
    }
    return true;
  });
}

/**
 * Sort tasks: overdue first, then by due date ascending.
 * Tasks without a due date go to the end.
 */
function sortTasks(arr) {
  return [...arr].sort((a, b) => {
    // Done tasks always go to the bottom
    if (a.status === 'Done' && b.status !== 'Done') return 1;
    if (b.status === 'Done' && a.status !== 'Done') return -1;

    // Overdue tasks float to the top
    const aOD = a.status !== 'Done' && isOverdue(a.due) ? 0 : 1;
    const bOD = b.status !== 'Done' && isOverdue(b.due) ? 0 : 1;
    if (aOD !== bOD) return aOD - bOD;

    // Then by due date ascending (no due → end)
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    return 0;
  });
}


// ═══════════════════════════════════════════════════════════════
// SUBTASK HELPERS
// Subtasks are stored as a JSON string on each task:
//   task.subtasks = '[{"id":"...","title":"Buy milk","done":false}]'
// ═══════════════════════════════════════════════════════════════

function parseSubtasks(task) {
  if (!task.subtasks) return [];
  try {
    const parsed = typeof task.subtasks === 'string'
      ? JSON.parse(task.subtasks)
      : task.subtasks;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeSubtasks(arr) {
  return JSON.stringify(arr);
}


// ═══════════════════════════════════════════════════════════════
// RENDER — TASK CARD (shared between list + board views)
// ═══════════════════════════════════════════════════════════════

function renderTaskCard(t) {
  const role = ROLES.find(r => r.id === t.role);
  const workType = WORK_TYPES.find(w => w.id === t.workType);
  const isDone = t.status === 'Done';

  // Priority → color bar + pill
  const prioColor = t.priority === 'High'   ? 'var(--accent-rose)'
                  : t.priority === 'Medium' ? 'var(--accent-gold)'
                  : 'var(--accent-teal)';
  const prioClass = t.priority === 'High'   ? 'pill-rose'
                  : t.priority === 'Medium' ? 'pill-gold'
                  : 'pill-teal';

  // Due date display + class
  const dueDateClass = !t.due ? ''
    : isDone ? 'upcoming'
    : isOverdue(t.due) ? 'overdue'
    : isToday(t.due) ? 'today'
    : 'upcoming';

  // Recurrence indicator
  const recurrence = t.recurrence && t.recurrence !== 'none'
    ? `<span class="pill pill-muted" style="gap:4px;">🔁 ${esc(t.recurrence)}</span>`
    : '';

  // Notes preview (truncated to 60 chars)
  const notesPreview = t.desc && t.desc.length > 0
    ? `<div style="font-size:12px; color:var(--text-tertiary); margin-top:var(--sp-1);
         overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:400px;">
         ${esc(t.desc.length > 60 ? t.desc.slice(0, 60) + '…' : t.desc)}
       </div>`
    : '';

  // Subtask progress
  const subtasks = parseSubtasks(t);
  const subtaskDone = subtasks.filter(s => s.done).length;
  const subtaskInfo = subtasks.length > 0
    ? `<span class="pill pill-muted" style="gap:2px;">☑ ${subtaskDone}/${subtasks.length}</span>`
    : '';

  return `
    <div class="task-card fade-in" style="margin-bottom:var(--sp-3);"
         data-task-id="${esc(t.id)}">
      <!-- Priority color bar via ::before -->
      <style>.task-card[data-task-id="${esc(t.id)}"]::before { background: ${prioColor}; }</style>

      <!-- Checkbox -->
      <div class="task-checkbox">
        <label class="checkbox-wrap">
          <input type="checkbox" ${isDone ? 'checked' : ''}
                 data-action="toggle-task" data-id="${esc(t.id)}">
        </label>
      </div>

      <!-- Body -->
      <div class="task-body" style="flex:1; min-width:0;">
        <div class="task-title ${isDone ? 'done' : ''}">${esc(t.title)}</div>

        <div class="task-meta">
          <span class="pill ${prioClass}">${esc(t.priority)}</span>
          ${role ? `<span class="pill pill-muted">${role.emoji} ${esc(role.name)}</span>` : ''}
          ${workType ? `<span class="pill pill-muted">${workType.ic} ${esc(workType.l)}</span>` : ''}
          ${t.due ? `<span class="task-due ${dueDateClass}">${formatDate(t.due)}</span>` : ''}
          ${recurrence}
          ${subtaskInfo}
        </div>

        ${notesPreview}
      </div>

      <!-- Actions -->
      <div style="display:flex; gap:var(--sp-1); flex-shrink:0; align-self:flex-start;">
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit-task" data-id="${esc(t.id)}" title="Edit">✏️</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete-task" data-id="${esc(t.id)}" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════
// RENDER — FILTER BAR
// ═══════════════════════════════════════════════════════════════

function renderFilterBar() {
  const f = state.taskFilters;

  // Build select options for each filter
  const roleOpts = ROLES.map(r =>
    `<option value="${esc(r.id)}" ${f.role === r.id ? 'selected' : ''}>${r.emoji} ${esc(r.name)}</option>`
  ).join('');

  const prioOpts = PRIORITIES.map(p =>
    `<option value="${esc(p)}" ${f.priority === p ? 'selected' : ''}>${esc(p)}</option>`
  ).join('');

  const statusOpts = STATUSES.map(s =>
    `<option value="${esc(s)}" ${f.status === s ? 'selected' : ''}>${esc(s)}</option>`
  ).join('');

  const wtOpts = WORK_TYPES.map(w =>
    `<option value="${esc(w.id)}" ${f.workType === w.id ? 'selected' : ''}>${w.ic} ${esc(w.l)}</option>`
  ).join('');

  // Active filter pills
  const pills = [];
  if (f.role) {
    const r = ROLES.find(x => x.id === f.role);
    pills.push({ key: 'role', label: r ? `${r.emoji} ${r.name}` : f.role });
  }
  if (f.priority) pills.push({ key: 'priority', label: f.priority });
  if (f.status)   pills.push({ key: 'status', label: f.status });
  if (f.workType) {
    const w = WORK_TYPES.find(x => x.id === f.workType);
    pills.push({ key: 'workType', label: w ? `${w.ic} ${w.l}` : f.workType });
  }
  if (f.search)   pills.push({ key: 'search', label: `"${f.search}"` });

  const pillsHtml = pills.length > 0
    ? `<div class="filter-active-pills mt-2">
         ${pills.map(p => `
           <button class="filter-pill" data-action="remove-filter" data-filter="${esc(p.key)}">
             ${esc(p.label)} <span class="x">×</span>
           </button>
         `).join('')}
         <button class="filter-pill" data-action="clear-filters" style="color:var(--accent-rose);">
           Clear all <span class="x">×</span>
         </button>
       </div>`
    : '';

  return `
    <div class="filter-bar">
      <select class="form-input" data-action="filter-role" style="min-width:130px;">
        <option value="">All Roles</option>
        ${roleOpts}
      </select>
      <select class="form-input" data-action="filter-priority" style="min-width:120px;">
        <option value="">All Priorities</option>
        ${prioOpts}
      </select>
      <select class="form-input" data-action="filter-status" style="min-width:120px;">
        <option value="">All Statuses</option>
        ${statusOpts}
      </select>
      <select class="form-input" data-action="filter-worktype" style="min-width:140px;">
        <option value="">All Work Types</option>
        ${wtOpts}
      </select>
      <div style="position:relative; flex:1; min-width:160px;">
        <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-tertiary); font-size:14px; pointer-events:none;">🔍</span>
        <input type="text" class="form-input" data-action="filter-search"
               placeholder="Search tasks…" value="${esc(f.search)}"
               style="padding-left:36px; font-size:12px;">
      </div>
    </div>
    ${pillsHtml}
  `;
}


// ═══════════════════════════════════════════════════════════════
// RENDER — LIST VIEW
// ═══════════════════════════════════════════════════════════════

function renderListView(filtered) {
  const sorted = sortTasks(filtered);

  if (sorted.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No tasks found</div>
        <div class="empty-desc">Try adjusting your filters or add a new task.</div>
        <button class="btn btn-primary" data-action="add-task">+ Add Task</button>
      </div>
    `;
  }

  return `<div class="task-list">${sorted.map(renderTaskCard).join('')}</div>`;
}


// ═══════════════════════════════════════════════════════════════
// RENDER — BOARD (KANBAN) VIEW
// Three columns: To Do, In Progress, Done
// ═══════════════════════════════════════════════════════════════

function renderBoardView(filtered) {
  const columns = [
    { status: 'To Do',       label: 'To Do',       color: 'var(--accent-blue)' },
    { status: 'In Progress', label: 'In Progress',  color: 'var(--accent-gold)' },
    { status: 'Done',        label: 'Done',         color: 'var(--accent-teal)' },
  ];

  return `
    <div class="board">
      ${columns.map(col => {
        const colTasks = sortTasks(filtered.filter(t => t.status === col.status));
        return `
          <div class="board-col">
            <div class="board-col-header">
              <span style="display:flex; align-items:center; gap:var(--sp-2);">
                <span style="width:8px; height:8px; border-radius:50%; background:${col.color};"></span>
                ${esc(col.label)}
              </span>
              <span class="board-col-count">${colTasks.length}</span>
            </div>
            ${colTasks.length > 0
              ? colTasks.map(t => {
                  // Determine target statuses for move buttons
                  const moveTargets = columns
                    .filter(c => c.status !== col.status)
                    .map(c => `
                      <button class="btn btn-ghost btn-sm" style="font-size:10px; padding:2px 8px;"
                              data-action="move-task" data-id="${esc(t.id)}" data-status="${esc(c.status)}">
                        → ${esc(c.label)}
                      </button>
                    `).join('');

                  return renderTaskCard(t) + `
                    <div style="display:flex; gap:var(--sp-1); padding:0 var(--sp-4) var(--sp-2); margin-top:-8px;">
                      ${moveTargets}
                    </div>
                  `;
                }).join('')
              : `<div style="text-align:center; padding:var(--sp-8) var(--sp-4); color:var(--text-tertiary); font-size:13px;">
                   No tasks
                 </div>`
            }
          </div>
        `;
      }).join('')}
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════
// RENDER — TASK MODAL (Create / Edit)
// ═══════════════════════════════════════════════════════════════

function renderTaskModal(task = null) {
  const isEdit = !!task;
  const t = task || {
    title: '', role: '', workType: '', priority: 'Medium', status: 'To Do',
    due: new Date().toISOString().slice(0, 10), recurrence: 'none',
    delegatedTo: '', desc: '', subtasks: '[]',
  };

  const subtasks = parseSubtasks(t);

  // Role select options
  const roleOpts = ROLES.map(r =>
    `<option value="${esc(r.id)}" ${t.role === r.id ? 'selected' : ''}>${r.emoji} ${esc(r.name)}</option>`
  ).join('');

  // Work type select options
  const wtOpts = WORK_TYPES.map(w =>
    `<option value="${esc(w.id)}" ${t.workType === w.id ? 'selected' : ''}>${w.ic} ${esc(w.l)}</option>`
  ).join('');

  // Priority select options
  const prioOpts = PRIORITIES.map(p =>
    `<option value="${esc(p)}" ${t.priority === p ? 'selected' : ''}>${esc(p)}</option>`
  ).join('');

  // Status select options
  const statusOpts = STATUSES.map(s =>
    `<option value="${esc(s)}" ${t.status === s ? 'selected' : ''}>${esc(s)}</option>`
  ).join('');

  // Recurrence select options
  const recOpts = RECURRENCES.map(r =>
    `<option value="${esc(r.id)}" ${(t.recurrence || 'none') === r.id ? 'selected' : ''}>${esc(r.label)}</option>`
  ).join('');

  // Subtask list
  const subtaskItems = subtasks.map((st, i) => `
    <div style="display:flex; align-items:center; gap:var(--sp-2); padding:var(--sp-1) 0;">
      <label class="checkbox-wrap">
        <input type="checkbox" ${st.done ? 'checked' : ''}
               data-action="toggle-subtask" data-index="${i}">
      </label>
      <span style="font-size:13px; flex:1; ${st.done ? 'text-decoration:line-through; opacity:0.5;' : ''}">${esc(st.title)}</span>
      <button class="btn btn-ghost btn-sm" data-action="remove-subtask" data-index="${i}" style="font-size:11px; padding:2px 6px;">×</button>
    </div>
  `).join('');

  return `
    <div class="modal-header">
      <div class="modal-title">${isEdit ? 'Edit Task' : 'New Task'}</div>
      <button class="modal-close" data-action="close-modal">×</button>
    </div>

    <!-- Title -->
    <div class="form-group">
      <label class="form-label">Title</label>
      <input type="text" class="form-input" id="task-title" placeholder="What needs to be done?"
             value="${esc(t.title)}">
    </div>

    <!-- Role + Work Type -->
    <div class="form-row mb-4">
      <div class="form-group">
        <label class="form-label">Role</label>
        <select class="form-input" id="task-role">
          <option value="">Select role…</option>
          ${roleOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Work Type</label>
        <select class="form-input" id="task-worktype">
          <option value="">Select type…</option>
          ${wtOpts}
        </select>
      </div>
    </div>

    <!-- Priority + Status -->
    <div class="form-row mb-4">
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-input" id="task-priority">
          ${prioOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-input" id="task-status">
          ${statusOpts}
        </select>
      </div>
    </div>

    <!-- Due Date + Recurrence -->
    <div class="form-row mb-4">
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input type="date" class="form-input" id="task-due" value="${esc(t.due || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Recurrence</label>
        <select class="form-input" id="task-recurrence">
          ${recOpts}
        </select>
      </div>
    </div>

    <!-- Delegated To -->
    <div class="form-group">
      <label class="form-label">Delegated To</label>
      <input type="text" class="form-input" id="task-delegated" placeholder="Person or team…"
             value="${esc(t.delegatedTo || '')}">
    </div>

    <!-- Notes -->
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-input" id="task-notes" rows="3"
                placeholder="Additional details…">${esc(t.desc || '')}</textarea>
    </div>

    <!-- Subtasks -->
    <div class="form-group">
      <label class="form-label">Subtasks</label>
      <div id="subtask-list">
        ${subtaskItems || '<div style="font-size:12px; color:var(--text-tertiary); padding:var(--sp-2) 0;">No subtasks yet</div>'}
      </div>
      <div style="display:flex; gap:var(--sp-2); margin-top:var(--sp-2);">
        <input type="text" class="form-input" id="new-subtask" placeholder="+ Add subtask…"
               style="font-size:13px;">
        <button class="btn btn-secondary btn-sm" data-action="add-subtask">Add</button>
      </div>
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button class="btn btn-primary" data-action="save-task" data-edit-id="${isEdit ? esc(t.id) : ''}">
        ${isEdit ? '💾 Update Task' : '➕ Create Task'}
      </button>
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════
// RENDER — MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export function renderTasks() {
  const view = state.taskView || 'list';
  const filtered = getFilteredTasks();

  const viewContent = view === 'board'
    ? renderBoardView(filtered)
    : renderListView(filtered);

  return `
    <!-- Page Header + View Toggle -->
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:var(--sp-3); margin-bottom:var(--sp-4);">
      <div class="page-header" style="margin-bottom:0;">
        <div class="page-title">Tasks</div>
        <div class="page-subtitle">${filtered.length} task${filtered.length !== 1 ? 's' : ''} · ${tasks.filter(t => t.status === 'Done').length} completed</div>
      </div>
      <div style="display:flex; align-items:center; gap:var(--sp-3);">
        <!-- Segmented Control for view toggle -->
        <div class="seg-control">
          <button class="seg-btn ${view === 'list' ? 'active' : ''}"
                  data-action="set-view" data-view="list">📋 List</button>
          <button class="seg-btn ${view === 'board' ? 'active' : ''}"
                  data-action="set-view" data-view="board">📊 Board</button>
        </div>
        <button class="btn btn-primary" data-action="add-task">+ Add Task</button>
      </div>
    </div>

    <!-- Filter Bar -->
    ${renderFilterBar()}

    <!-- Task Content -->
    <div class="mt-4">
      ${viewContent}
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════
// BIND
// Comprehensive event delegation for every interactive element.
// ═══════════════════════════════════════════════════════════════

export function bindTasks(container) {
  // Track current modal subtask state (in-memory while modal is open)
  let modalSubtasks = [];
  let editingTaskId = null;

  // ── Helper: open the task modal ──
  function openTaskModal(taskId = null) {
    const task = taskId ? tasks.find(t => t.id === taskId) : null;
    editingTaskId = taskId;
    modalSubtasks = task ? parseSubtasks(task) : [];

    import('../app.js').then(app => {
      app.openModal(renderTaskModal(task), 'modal-lg');

      // Bind modal-specific events after DOM is ready
      requestAnimationFrame(() => {
        const modalRoot = document.getElementById('modal-root');
        if (!modalRoot) return;

        modalRoot.addEventListener('click', handleModalClick);
        modalRoot.addEventListener('keydown', handleModalKeydown);
      });
    });
  }

  // ── Helper: re-render subtask list inside modal ──
  function refreshModalSubtasks() {
    const list = document.getElementById('subtask-list');
    if (!list) return;

    if (modalSubtasks.length === 0) {
      list.innerHTML = '<div style="font-size:12px; color:var(--text-tertiary); padding:var(--sp-2) 0;">No subtasks yet</div>';
      return;
    }

    list.innerHTML = modalSubtasks.map((st, i) => `
      <div style="display:flex; align-items:center; gap:var(--sp-2); padding:var(--sp-1) 0;">
        <label class="checkbox-wrap">
          <input type="checkbox" ${st.done ? 'checked' : ''}
                 data-action="toggle-subtask" data-index="${i}">
        </label>
        <span style="font-size:13px; flex:1; ${st.done ? 'text-decoration:line-through; opacity:0.5;' : ''}">${esc(st.title)}</span>
        <button class="btn btn-ghost btn-sm" data-action="remove-subtask" data-index="${i}" style="font-size:11px; padding:2px 6px;">×</button>
      </div>
    `).join('');
  }

  // ── Helper: save task from modal form ──
  function saveTaskFromModal(editId) {
    const title = document.getElementById('task-title')?.value.trim();
    if (!title) {
      import('../app.js').then(app => app.toast('Please enter a task title', 'error'));
      return;
    }

    const taskData = {
      id: editId || generateId(),
      title,
      role:        document.getElementById('task-role')?.value || '',
      workType:    document.getElementById('task-worktype')?.value || '',
      priority:    document.getElementById('task-priority')?.value || 'Medium',
      status:      document.getElementById('task-status')?.value || 'To Do',
      due:         document.getElementById('task-due')?.value || '',
      recurrence:  document.getElementById('task-recurrence')?.value || 'none',
      delegatedTo: document.getElementById('task-delegated')?.value.trim() || '',
      desc:        document.getElementById('task-notes')?.value.trim() || '',
      subtasks:    serializeSubtasks(modalSubtasks),
      created:     editId
        ? (tasks.find(t => t.id === editId)?.created || new Date().toISOString())
        : new Date().toISOString(),
      completed: null,
    };

    // Set completed timestamp if status is Done
    if (taskData.status === 'Done') {
      const existing = editId ? tasks.find(t => t.id === editId) : null;
      taskData.completed = existing?.completed || new Date().toISOString();
    }

    if (editId) {
      // Update existing task
      const idx = tasks.findIndex(t => t.id === editId);
      if (idx !== -1) tasks[idx] = taskData;
    } else {
      // Create new task
      tasks.push(taskData);
    }

    saveTasks();

    import('../app.js').then(app => {
      app.closeModal();
      app.toast(editId ? '✓ Task updated' : '✓ Task created', 'success');
      app.renderPage();
    });
  }

  // ── Modal click handler ──
  function handleModalClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;

    switch (action) {
      case 'close-modal':
        import('../app.js').then(app => app.closeModal());
        break;

      case 'save-task': {
        const editId = el.dataset.editId || null;
        saveTaskFromModal(editId);
        break;
      }

      case 'add-subtask': {
        const input = document.getElementById('new-subtask');
        const title = input?.value.trim();
        if (!title) return;
        modalSubtasks.push({ id: generateId(), title, done: false });
        input.value = '';
        refreshModalSubtasks();
        break;
      }

      case 'toggle-subtask': {
        const idx = parseInt(el.dataset.index ?? e.target.closest('[data-index]')?.dataset.index, 10);
        if (!isNaN(idx) && modalSubtasks[idx]) {
          modalSubtasks[idx].done = !modalSubtasks[idx].done;
          refreshModalSubtasks();
        }
        break;
      }

      case 'remove-subtask': {
        const idx = parseInt(el.dataset.index, 10);
        if (!isNaN(idx)) {
          modalSubtasks.splice(idx, 1);
          refreshModalSubtasks();
        }
        break;
      }
    }
  }

  // ── Modal keydown handler (Enter in subtask input) ──
  function handleModalKeydown(e) {
    if (e.key === 'Enter' && e.target.id === 'new-subtask') {
      e.preventDefault();
      const title = e.target.value.trim();
      if (!title) return;
      modalSubtasks.push({ id: generateId(), title, done: false });
      e.target.value = '';
      refreshModalSubtasks();
    }
  }

  // ── Main container click delegation ──
  container.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;

    switch (action) {

      // ── View Toggle ──
      case 'set-view': {
        const view = el.dataset.view;
        if (view && (view === 'list' || view === 'board')) {
          state.taskView = view;
          import('../app.js').then(app => app.renderPage());
        }
        break;
      }

      // ── Filters ──
      case 'filter-role': {
        state.taskFilters.role = el.value;
        import('../app.js').then(app => app.renderPage());
        break;
      }
      case 'filter-priority': {
        state.taskFilters.priority = el.value;
        import('../app.js').then(app => app.renderPage());
        break;
      }
      case 'filter-status': {
        state.taskFilters.status = el.value;
        import('../app.js').then(app => app.renderPage());
        break;
      }
      case 'filter-worktype': {
        state.taskFilters.workType = el.value;
        import('../app.js').then(app => app.renderPage());
        break;
      }

      // Remove a single filter pill
      case 'remove-filter': {
        const key = el.dataset.filter;
        if (key && state.taskFilters.hasOwnProperty(key)) {
          state.taskFilters[key] = '';
          import('../app.js').then(app => app.renderPage());
        }
        break;
      }

      // Clear all filters
      case 'clear-filters': {
        state.taskFilters = { role: '', priority: '', status: '', workType: '', search: '' };
        import('../app.js').then(app => app.renderPage());
        break;
      }

      // ── CRUD ──
      case 'add-task': {
        openTaskModal();
        break;
      }

      case 'edit-task': {
        const id = el.dataset.id;
        if (id) openTaskModal(id);
        break;
      }

      case 'delete-task': {
        const id = el.dataset.id;
        if (!id) return;
        const taskToDelete = tasks.find(t => t.id === id);
        if (!taskToDelete) return;
        import('../app.js').then(app => {
          app.openModal(`
            <div style="margin-bottom:var(--sp-4)"><div class="section-title">🗑️ Delete Task</div></div>
            <p class="text-secondary" style="margin-bottom:var(--sp-2)">Delete "${esc(taskToDelete.title)}"?</p>
            <p class="text-secondary" style="font-size:12px;margin-bottom:var(--sp-4)">This cannot be undone.</p>
            <div style="display:flex;gap:var(--sp-3);justify-content:flex-end">
              <button class="btn btn-ghost" data-action="close-modal">Cancel</button>
              <button class="btn btn-danger" id="confirm-del-task">🗑️ Delete</button>
            </div>
          `);
          document.getElementById('confirm-del-task')?.addEventListener('click', () => {
            const idx = tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
              tasks.splice(idx, 1);
              saveTasks();
              app.closeModal();
              app.toast('✓ Task deleted', 'success');
              app.renderPage();
            }
          });
        });
        break;
      }

      // ── Toggle task completion (checkbox) ──
      case 'toggle-task': {
        e.stopPropagation();
        const id = el.dataset.id || e.target.closest('[data-id]')?.dataset.id;
        if (!id) return;
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        if (task.status === 'Done') {
          task.status = 'To Do';
          task.completed = null;
        } else {
          task.status = 'Done';
          task.completed = new Date().toISOString();
        }

        saveTasks();
        import('../app.js').then(app => {
          app.toast(task.status === 'Done' ? '✓ Task completed' : '↩ Task reopened', 'success');
          app.renderPage();
        });
        break;
      }

      // ── Move task between Kanban columns ──
      case 'move-task': {
        const id = el.dataset.id;
        const newStatus = el.dataset.status;
        if (!id || !newStatus) return;
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        task.status = newStatus;
        if (newStatus === 'Done') {
          task.completed = task.completed || new Date().toISOString();
        } else {
          task.completed = null;
        }

        saveTasks();
        import('../app.js').then(app => {
          app.toast(`→ Moved to ${newStatus}`, 'success');
          app.renderPage();
        });
        break;
      }
    }
  });

  // ── Filter change events (selects use 'change', not 'click') ──
  container.addEventListener('change', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    const action = el.dataset.action;

    switch (action) {
      case 'filter-role':
        state.taskFilters.role = el.value;
        import('../app.js').then(app => app.renderPage());
        break;
      case 'filter-priority':
        state.taskFilters.priority = el.value;
        import('../app.js').then(app => app.renderPage());
        break;
      case 'filter-status':
        state.taskFilters.status = el.value;
        import('../app.js').then(app => app.renderPage());
        break;
      case 'filter-worktype':
        state.taskFilters.workType = el.value;
        import('../app.js').then(app => app.renderPage());
        break;
    }
  });

  // ── Search input (debounced) ──
  let searchTimer = null;
  container.addEventListener('input', (e) => {
    if (e.target.dataset.action === 'filter-search') {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.taskFilters.search = e.target.value.trim();
        import('../app.js').then(app => app.renderPage());
      }, 300);
    }
  });

  // ── Listen for topbar "Add Task" button ──
  if (_topbarHandler) document.removeEventListener('topbar-action', _topbarHandler);
  _topbarHandler = (e) => {
    if (e.detail?.action === 'add-task') openTaskModal();
  };
  document.addEventListener('topbar-action', _topbarHandler);
}
