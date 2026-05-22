// ═══════════════════════════════════════════════════════════════════════════
// LIFE OS 2026 — Unified Google Apps Script Backend
// Combines finance/life data sync + task management in a single deployment.
// ═══════════════════════════════════════════════════════════════════════════
//
// SETUP:
// 1. Open your Google Sheet
// 2. Extensions → Apps Script
// 3. Delete all existing code, paste this file, click Save
// 4. Click Deploy → New Deployment → Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy the Web App URL into Life OS Settings → Sync
// ═══════════════════════════════════════════════════════════════════════════

// ── CONFIGURATION ──────────────────────────────────────────────────────────
// The spreadsheet ID is auto-detected from the active spreadsheet.
// If you want to use a different spreadsheet, set its ID here:
const SPREADSHEET_ID = '1Unn4PyoqJGo2nUDs1tQ8I7Ro-_rhRBk5xY_5OYSwnl4';

// Sheet names — auto-created on first run
const SHEETS = {
  EXPENSES_GHS : 'Expenses_GHS',
  EXPENSES_USD : 'Expenses_USD',
  EXPENSES_GBP : 'Expenses_GBP',
  WEALTH       : 'Wealth',
  GOALS        : 'Goals',
  ACTIVITIES   : 'Activities',
  BEAUTY       : 'Beauty',
  CAL_ACTS     : 'CalActs',
  RHYTHM       : 'Rhythm',
  RULES        : 'Rules',
  MEALS        : 'Meals',
  BUDGETS_GHS  : 'Budgets_GHS',
  BUDGETS_USD  : 'Budgets_USD',
  BUDGETS_GBP  : 'Budgets_GBP',
  PAY_CHECKS   : 'PayChecks',
  TASKS        : 'Tasks',
  META         : '_Meta',
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY POINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET ?action=pull   → Returns full data snapshot (all sheets)
 * GET ?action=health → Simple ping
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'pull';
    if (action === 'health') {
      return jsonResponse({ ok: true, ts: new Date().toISOString(), version: 2 });
    }
    if (action === 'pull') {
      return jsonResponse(pullAllData());
    }
    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

/**
 * POST body: { action, payload }
 *
 * Life OS Actions:
 *   push_all        — Full snapshot sync
 *   save_expense    — Add/edit one expense { curr, exp, idx? }
 *   delete_expense  — Remove one expense { curr, idx }
 *   save_wealth     — Add/edit wealth row { row, idx? }
 *   save_goal       — Add/edit goal { goal, idx? }
 *   delete_goal     — Remove goal { idx }
 *   save_budgets    — Persist budget overrides { type, budgets }
 *   save_pay_checks — Persist pay-check ticks { month, checks }
 *   save_cal_acts   — Save calendar activities { calActs }
 *   save_rhythm     — Save daily rhythm { rhythm }
 *   save_meals      — Save meal plan { meals }
 *   save_rules      — Save rules { rules }
 *   save_beauty     — Save beauty calendar { beauty }
 *   save_activities — Save activities { activities }
 *
 * Task Actions:
 *   save_task       — Add/update a single task { task }
 *   delete_task     — Delete a task by ID { id }
 *   sync_tasks      — Full replace of all tasks { tasks }
 */
function doPost(e) {
  try {
    const body    = JSON.parse(e.postData.contents);
    const action  = body.action;
    const payload = body.payload || {};

    switch (action) {
      // ── Life OS data ──
      case 'push_all':        return jsonResponse(pushAllData(payload));
      case 'save_expense':    return jsonResponse(saveExpense(payload));
      case 'delete_expense':  return jsonResponse(deleteExpense(payload));
      case 'save_wealth':     return jsonResponse(saveWealth(payload));
      case 'save_goal':       return jsonResponse(saveGoal(payload));
      case 'delete_goal':     return jsonResponse(deleteGoal(payload));
      case 'save_budgets':    return jsonResponse(saveBudgets(payload));
      case 'save_pay_checks': return jsonResponse(savePayChecks(payload));
      case 'save_cal_acts':   return jsonResponse(saveCalActs(payload));
      case 'save_rhythm':     return jsonResponse(saveSimpleArray(SHEETS.RHYTHM, payload.rhythm));
      case 'save_meals':      return jsonResponse(saveMeals(payload));
      case 'save_rules':      return jsonResponse(saveSimpleArray(SHEETS.RULES, payload.rules));
      case 'save_beauty':     return jsonResponse(saveBeauty(payload));
      case 'save_activities': return jsonResponse(saveActivities(payload));

      // ── Tasks ──
      case 'save_task':       return jsonResponse(saveTask(payload));
      case 'delete_task':     return jsonResponse(deleteTaskById(payload));
      case 'sync_tasks':      return jsonResponse(syncAllTasks(payload));

      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHEET HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/** Get or create a named sheet with optional header row. */
function getSheet(name, headers) {
  const book  = ss();
  let   sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    if (headers && headers.length) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
           .setFontWeight('bold')
           .setBackground('#111627')
           .setFontColor('#e8eaf0');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/** Read all data rows (skips header). */
function readRows(name) {
  const sheet = ss().getSheetByName(name);
  if (!sheet) return [];
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
}

/** Overwrite all data rows (preserves header). */
function writeRows(name, rows, headers) {
  const sheet = getSheet(name, headers);
  const last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).clearContent();
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/** Append a single row. */
function appendRow(name, row, headers) {
  getSheet(name, headers).appendRow(row);
}

/** Update a specific data row (0-based data index). */
function updateRow(name, idx, row) {
  const sheet = ss().getSheetByName(name);
  if (!sheet) return;
  sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
}

/** Delete a data row by 0-based index. */
function deleteRow(name, idx) {
  const sheet = ss().getSheetByName(name);
  if (!sheet) return;
  sheet.deleteRow(idx + 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// PULL ALL DATA
// ═══════════════════════════════════════════════════════════════════════════

function pullAllData() {
  ensureSheets();
  return {
    exps       : pullExpenses(),
    wrows      : pullWealth(),
    goals      : pullGoals(),
    activities : pullActivities(),
    beauty     : pullBeauty(),
    calActs    : pullCalActs(),
    rhythm     : pullRhythm(),
    rules      : pullRules(),
    meals      : pullMeals(),
    ghsBudgets : pullBudgets('ghs'),
    usdBudgets : pullBudgets('usd'),
    gbpBudgets : pullBudgets('gbp'),
    payChecks  : pullPayChecks(),
    tasks      : pullTasks(),
    pulledAt   : new Date().toISOString(),
    version    : 2,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUSH ALL DATA
// ═══════════════════════════════════════════════════════════════════════════

function pushAllData(data) {
  ensureSheets();
  if (data.exps)       pushExpenses(data.exps);
  if (data.wrows)      pushWealth(data.wrows);
  if (data.goals)      pushGoals(data.goals);
  if (data.activities) pushActivitiesData(data.activities);
  if (data.beauty)     pushBeautyData(data.beauty);
  if (data.calActs)    pushCalActsData(data.calActs);
  if (data.rhythm)     pushRhythmData(data.rhythm);
  if (data.rules)      pushRulesData(data.rules);
  if (data.meals)      pushMealsData(data.meals);
  if (data.ghsBudgets) pushBudgets('ghs', data.ghsBudgets);
  if (data.usdBudgets) pushBudgets('usd', data.usdBudgets);
  if (data.gbpBudgets) pushBudgets('gbp', data.gbpBudgets);
  if (data.payChecks)  pushPayChecksData(data.payChecks);
  if (data.tasks)      pushTasksData(data.tasks);
  setMeta('lastPush', new Date().toISOString());
  return { ok: true, pushedAt: new Date().toISOString() };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════════

const EXP_HEADERS = ['month','date','category','description','amount','method'];

function expSheetName(curr) {
  return curr === 'ghs' ? SHEETS.EXPENSES_GHS
       : curr === 'usd' ? SHEETS.EXPENSES_USD
       : SHEETS.EXPENSES_GBP;
}

function pullExpenses() {
  const result = { ghs: [], usd: [], gbp: [] };
  ['ghs','usd','gbp'].forEach(curr => {
    result[curr] = readRows(expSheetName(curr)).map(r => ({
      month:       r[0] || '',
      date:        r[1] || '',
      category:    r[2] || '',
      description: r[3] || '',
      amount:      parseFloat(r[4]) || 0,
      method:      r[5] || '',
    }));
  });
  return result;
}

function pushExpenses(exps) {
  ['ghs','usd','gbp'].forEach(curr => {
    const rows = (exps[curr] || []).map(e => [
      e.month, e.date, e.category, e.description, e.amount, e.method || '',
    ]);
    writeRows(expSheetName(curr), rows, EXP_HEADERS);
  });
}

function saveExpense(payload) {
  const { curr, exp, idx } = payload;
  const name = expSheetName(curr);
  const row  = [exp.month, exp.date, exp.category, exp.description, exp.amount, exp.method || ''];
  if (idx !== undefined && idx !== null && idx >= 0) {
    updateRow(name, idx, row);
  } else {
    appendRow(name, row, EXP_HEADERS);
  }
  return { ok: true };
}

function deleteExpense(payload) {
  deleteRow(expSheetName(payload.curr), payload.idx);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// WEALTH
// ═══════════════════════════════════════════════════════════════════════════

const WEALTH_HEADERS = ['month','usd','gbp','ghs','debts','notes'];

function pullWealth() {
  return readRows(SHEETS.WEALTH).map(r => ({
    month: r[0] || '', usd: parseFloat(r[1]) || 0, gbp: parseFloat(r[2]) || 0,
    ghs: parseFloat(r[3]) || 0, debts: parseFloat(r[4]) || 0, notes: r[5] || '',
  }));
}

function pushWealth(rows) {
  writeRows(SHEETS.WEALTH, rows.map(r => [r.month, r.usd, r.gbp, r.ghs, r.debts, r.notes || '']), WEALTH_HEADERS);
}

function saveWealth(payload) {
  const { row, idx } = payload;
  const r = [row.month, row.usd, row.gbp, row.ghs, row.debts, row.notes || ''];
  if (idx !== undefined && idx !== null && idx >= 0) updateRow(SHEETS.WEALTH, idx, r);
  else appendRow(SHEETS.WEALTH, r, WEALTH_HEADERS);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════════════════════════

const GOAL_HEADERS = ['name','target','saved','deadline','notes','currency'];

function pullGoals() {
  return readRows(SHEETS.GOALS).map(r => ({
    n: r[0] || '', t: parseFloat(r[1]) || 0, s: parseFloat(r[2]) || 0,
    d: r[3] || '', notes: r[4] || '', curr: r[5] || 'usd',
  }));
}

function pushGoals(goals) {
  writeRows(SHEETS.GOALS, goals.map(g => [g.n, g.t, g.s, g.d || '', g.notes || '', g.curr || 'usd']), GOAL_HEADERS);
}

function saveGoal(payload) {
  const { goal, idx } = payload;
  const r = [goal.n, goal.t, goal.s, goal.d || '', goal.notes || '', goal.curr || 'usd'];
  if (idx !== undefined && idx !== null && idx >= 0) updateRow(SHEETS.GOALS, idx, r);
  else appendRow(SHEETS.GOALS, r, GOAL_HEADERS);
  return { ok: true };
}

function deleteGoal(payload) {
  deleteRow(SHEETS.GOALS, payload.idx);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITIES
// ═══════════════════════════════════════════════════════════════════════════

const ACT_HEADERS = ['month','icon','name','detail','budget'];

function pullActivities() {
  return readRows(SHEETS.ACTIVITIES).map(r => ({
    m: r[0] || '', i: r[1] || '', n: r[2] || '', d: r[3] || '', b: r[4] || '',
  }));
}

function pushActivitiesData(acts) {
  writeRows(SHEETS.ACTIVITIES, acts.map(a => [a.m, a.i, a.n, a.d, a.b]), ACT_HEADERS);
}

function saveActivities(payload) {
  pushActivitiesData(payload.activities);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// BEAUTY
// ═══════════════════════════════════════════════════════════════════════════

const BEAUTY_HEADERS = ['month','service','details','cost'];

function pullBeauty() {
  return readRows(SHEETS.BEAUTY).map(r => ({
    m: r[0] || '', s: r[1] || '', d: r[2] || '', c: r[3] || '',
  }));
}

function pushBeautyData(beauty) {
  writeRows(SHEETS.BEAUTY, beauty.map(b => [b.m, b.s, b.d, b.c]), BEAUTY_HEADERS);
}

function saveBeauty(payload) {
  pushBeautyData(payload.beauty);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// CALENDAR ACTIVITIES
// ═══════════════════════════════════════════════════════════════════════════

const CAL_HEADERS = ['date','text','time','color'];

function pullCalActs() {
  const result = {};
  readRows(SHEETS.CAL_ACTS).forEach(r => {
    const date = r[0] || '';
    if (!date) return;
    if (!result[date]) result[date] = [];
    result[date].push({
      text:  r[1] || '',
      time:  r[2] || '',
      color: r[3] || 'teal',
    });
  });
  return result;
}

function pushCalActsData(calActs) {
  const rows = [];
  Object.entries(calActs).forEach(([date, acts]) => {
    (acts || []).forEach(act => {
      if (typeof act === 'string') {
        rows.push([date, act, '', 'teal']);
      } else {
        rows.push([date, act.text || act, act.time || '', act.color || 'teal']);
      }
    });
  });
  writeRows(SHEETS.CAL_ACTS, rows, CAL_HEADERS);
}

function saveCalActs(payload) {
  pushCalActsData(payload.calActs);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// RHYTHM
// ═══════════════════════════════════════════════════════════════════════════

const RHYTHM_HEADERS = ['time','description'];

function pullRhythm() {
  return readRows(SHEETS.RHYTHM).map(r => [r[0] || '', r[1] || '']);
}

function pushRhythmData(rhythm) {
  const data = rhythm.map(r => Array.isArray(r) ? [r[0], r[1]] : [r.time || '', r.desc || '']);
  writeRows(SHEETS.RHYTHM, data, RHYTHM_HEADERS);
}

function saveSimpleArray(sheetName, arr) {
  if (sheetName === SHEETS.RHYTHM) pushRhythmData(arr);
  else if (sheetName === SHEETS.RULES) pushRulesData(arr);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════

const RULES_HEADERS = ['rule'];

function pullRules() {
  return readRows(SHEETS.RULES).map(r => r[0] || '').filter(Boolean);
}

function pushRulesData(rules) {
  writeRows(SHEETS.RULES, rules.map(r => [r]), RULES_HEADERS);
}

// ═══════════════════════════════════════════════════════════════════════════
// MEALS
// ═══════════════════════════════════════════════════════════════════════════

const MEAL_HEADERS = ['day','breakfast','lunch','dinner','groceries'];

function pullMeals() {
  return readRows(SHEETS.MEALS).map(r => ({
    day: r[0] || '', b: r[1] || '', l: r[2] || '', d: r[3] || '', g: r[4] || '',
  }));
}

function pushMealsData(meals) {
  writeRows(SHEETS.MEALS, meals.map(m => [m.day, m.b, m.l, m.d, m.g]), MEAL_HEADERS);
}

function saveMeals(payload) {
  pushMealsData(payload.meals);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════════════════════════

const BUD_HEADERS = ['key','value'];

function budSheetName(type) {
  return type === 'ghs' ? SHEETS.BUDGETS_GHS
       : type === 'usd' ? SHEETS.BUDGETS_USD
       : SHEETS.BUDGETS_GBP;
}

function pullBudgets(type) {
  const result = {};
  readRows(budSheetName(type)).forEach(r => {
    if (r[0]) result[r[0]] = parseFloat(r[1]) || 0;
  });
  return result;
}

function pushBudgets(type, budgets) {
  writeRows(budSheetName(type), Object.entries(budgets).map(([k, v]) => [k, v]), BUD_HEADERS);
}

function saveBudgets(payload) {
  pushBudgets(payload.type, payload.budgets);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// PAY CHECKS
// ═══════════════════════════════════════════════════════════════════════════

const PAY_HEADERS = ['month','idx','checked'];

function pullPayChecks() {
  const result = {};
  readRows(SHEETS.PAY_CHECKS).forEach(r => {
    const month = r[0] || '';
    if (!month) return;
    if (!result[month]) result[month] = {};
    result[month][r[1]] = r[2] === true || r[2] === 'TRUE' || r[2] === 1;
  });
  return result;
}

function pushPayChecksData(payChecks) {
  const rows = [];
  Object.entries(payChecks).forEach(([month, checks]) => {
    Object.entries(checks).forEach(([idx, done]) => {
      rows.push([month, parseInt(idx), done]);
    });
  });
  writeRows(SHEETS.PAY_CHECKS, rows, PAY_HEADERS);
}

function savePayChecks(payload) {
  const all = pullPayChecks();
  all[payload.month] = payload.checks;
  pushPayChecksData(all);
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// TASKS (unified task management)
// ═══════════════════════════════════════════════════════════════════════════

const TASK_HEADERS = [
  'id', 'title', 'role', 'workType', 'priority', 'status',
  'due', 'startDate', 'notes', 'subtasks', 'delegatedTo',
  'recurrence', 'recurrEnd', 'createdAt'
];

function pullTasks() {
  return readRows(SHEETS.TASKS).map(r => ({
    id:          r[0]  || '',
    title:       r[1]  || '',
    role:        r[2]  || '',
    workType:    r[3]  || '',
    priority:    r[4]  || 'Medium',
    status:      r[5]  || 'To Do',
    due:         r[6]  || '',
    startDate:   r[7]  || '',
    notes:       r[8]  || '',
    subtasks:    r[9]  ? (typeof r[9] === 'string' ? r[9] : JSON.stringify(r[9])) : '[]',
    delegatedTo: r[10] || '',
    recurrence:  r[11] || 'none',
    recurrEnd:   r[12] || '',
    createdAt:   r[13] || '',
  }));
}

function pushTasksData(tasks) {
  const rows = tasks.map(t => [
    t.id, t.title, t.role || '', t.workType || '', t.priority || 'Medium',
    t.status || 'To Do', t.due || '', t.startDate || '', t.notes || '',
    typeof t.subtasks === 'string' ? t.subtasks : JSON.stringify(t.subtasks || []),
    t.delegatedTo || '', t.recurrence || 'none', t.recurrEnd || '',
    t.createdAt || new Date().toISOString(),
  ]);
  writeRows(SHEETS.TASKS, rows, TASK_HEADERS);
}

function saveTask(payload) {
  const { task } = payload;
  const sheet = getSheet(SHEETS.TASKS, TASK_HEADERS);
  
  // Try to find existing task by ID
  if (task.id) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === task.id) {
        // Update existing row
        const row = [
          task.id, task.title, task.role || '', task.workType || '', task.priority || 'Medium',
          task.status || 'To Do', task.due || '', task.startDate || '', task.notes || '',
          typeof task.subtasks === 'string' ? task.subtasks : JSON.stringify(task.subtasks || []),
          task.delegatedTo || '', task.recurrence || 'none', task.recurrEnd || '',
          task.createdAt || data[i][13] || new Date().toISOString(),
        ];
        sheet.getRange(i + 1, 1, 1, TASK_HEADERS.length).setValues([row]);
        return { ok: true, task: task };
      }
    }
  }
  
  // Not found — add new
  if (!task.id) {
    task.id = 'T' + new Date().getTime().toString(36) + Math.random().toString(36).slice(2, 5);
  }
  if (!task.createdAt) task.createdAt = new Date().toISOString();
  
  const row = [
    task.id, task.title, task.role || '', task.workType || '', task.priority || 'Medium',
    task.status || 'To Do', task.due || '', task.startDate || '', task.notes || '',
    typeof task.subtasks === 'string' ? task.subtasks : JSON.stringify(task.subtasks || []),
    task.delegatedTo || '', task.recurrence || 'none', task.recurrEnd || '',
    task.createdAt,
  ];
  sheet.appendRow(row);
  return { ok: true, task: task };
}

function deleteTaskById(payload) {
  const { id } = payload;
  const sheet = ss().getSheetByName(SHEETS.TASKS);
  if (!sheet) return { ok: true };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { ok: true, id: id };
    }
  }
  return { ok: true, id: id };
}

function syncAllTasks(payload) {
  const { tasks } = payload;
  if (tasks) pushTasksData(tasks);
  return { ok: true, count: tasks ? tasks.length : 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// META
// ═══════════════════════════════════════════════════════════════════════════

function setMeta(key, value) {
  const sheet = getSheet(SHEETS.META, ['key','value','updatedAt']);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) {
      sheet.getRange(i + 1, 2, 1, 2).setValues([[value, new Date().toISOString()]]);
      return;
    }
  }
  sheet.appendRow([key, value, new Date().toISOString()]);
}

// ═══════════════════════════════════════════════════════════════════════════
// ENSURE ALL SHEETS EXIST
// ═══════════════════════════════════════════════════════════════════════════

function ensureSheets() {
  getSheet(SHEETS.EXPENSES_GHS, EXP_HEADERS);
  getSheet(SHEETS.EXPENSES_USD, EXP_HEADERS);
  getSheet(SHEETS.EXPENSES_GBP, EXP_HEADERS);
  getSheet(SHEETS.WEALTH,       WEALTH_HEADERS);
  getSheet(SHEETS.GOALS,        GOAL_HEADERS);
  getSheet(SHEETS.ACTIVITIES,   ACT_HEADERS);
  getSheet(SHEETS.BEAUTY,       BEAUTY_HEADERS);
  getSheet(SHEETS.CAL_ACTS,     CAL_HEADERS);
  getSheet(SHEETS.RHYTHM,       RHYTHM_HEADERS);
  getSheet(SHEETS.RULES,        RULES_HEADERS);
  getSheet(SHEETS.MEALS,        MEAL_HEADERS);
  getSheet(SHEETS.BUDGETS_GHS,  BUD_HEADERS);
  getSheet(SHEETS.BUDGETS_USD,  BUD_HEADERS);
  getSheet(SHEETS.BUDGETS_GBP,  BUD_HEADERS);
  getSheet(SHEETS.PAY_CHECKS,   PAY_HEADERS);
  getSheet(SHEETS.TASKS,        TASK_HEADERS);
  getSheet(SHEETS.META,         ['key','value','updatedAt']);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE HELPER
// ═══════════════════════════════════════════════════════════════════════════

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
// ONE-TIME SETUP — Run manually from the editor to initialize sheets
// ═══════════════════════════════════════════════════════════════════════════

function initialSetup() {
  ensureSheets();
  Logger.log('✓ All sheets created. Spreadsheet ID: ' + SPREADSHEET_ID);
  Logger.log('Next: Deploy as Web App and paste the URL into Life OS Settings.');
}

function testGet() {
  const result = pullAllData();
  Logger.log(JSON.stringify(result, null, 2));
}
