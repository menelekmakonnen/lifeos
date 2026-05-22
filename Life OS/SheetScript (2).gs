// ════════════════════════════════════════════════════════════════════════════
// LIFE OS 2026 — Google Apps Script Backend
// Deploy as: Web App · Execute as: Me · Who has access: Anyone
// ════════════════════════════════════════════════════════════════════════════

// ── CONFIGURATION ────────────────────────────────────────────────────────────
// After creating your Google Sheet, paste its ID here (from the URL):
//   https://docs.google.com/spreadsheets/d/  <<SPREADSHEET_ID>>  /edit
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// Sheet names — must match exactly (auto-created on first run)
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
  META         : '_Meta',
};

// ── ENTRY POINTS ─────────────────────────────────────────────────────────────

/**
 * GET  ?action=pull
 *   Returns the full data snapshot as JSON (all sheets → in-app data model).
 *
 * GET  ?action=health
 *   Simple ping to confirm the Web App is live.
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'pull';
    if (action === 'health') {
      return jsonResponse({ ok: true, ts: new Date().toISOString() });
    }
    if (action === 'pull') {
      return jsonResponse(pullAllData());
    }
    return jsonResponse({ error: 'Unknown action: ' + action }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack }, 500);
  }
}

/**
 * POST  body: { action, payload }
 *
 * Actions:
 *   push_all       — full snapshot sync (payload = entire data object)
 *   save_expense   — add/edit one expense (payload = { curr, exp, idx? })
 *   delete_expense — remove one expense  (payload = { curr, idx })
 *   save_wealth    — add/edit wealth row  (payload = { row, idx? })
 *   save_goal      — add/edit goal        (payload = { goal, idx? })
 *   delete_goal    — remove goal          (payload = { idx })
 *   save_budgets   — persist budget overrides (payload = { type, budgets })
 *   save_pay_checks— persist pay-check ticks  (payload = { month, checks })
 *   save_cal_acts  — save calendar activities (payload = { calActs })
 *   save_rhythm    — save daily rhythm    (payload = { rhythm })
 *   save_meals     — save meal plan       (payload = { meals })
 *   save_rules     — save rules           (payload = { rules })
 *   save_beauty    — save beauty calendar (payload = { beauty })
 *   save_activities— save activities list (payload = { activities })
 *   push_all       — replace everything at once
 */
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action  = body.action;
    const payload = body.payload || {};

    switch (action) {
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
      default:
        return jsonResponse({ error: 'Unknown action: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack }, 500);
  }
}

// ── SHEET HELPERS ─────────────────────────────────────────────────────────────

function ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Get or create a named sheet; optionally set header row.
 */
function getSheet(name, headers) {
  const book  = ss();
  let   sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    if (headers && headers.length) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
           .setFontWeight('bold')
           .setBackground('#2B5F52')
           .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Read all data rows from a sheet (skips header row 1).
 * Returns array of plain arrays.
 */
function readRows(name) {
  const sheet = ss().getSheetByName(name);
  if (!sheet) return [];
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
}

/**
 * Overwrite all data rows (keeps header in row 1).
 */
function writeRows(name, rows, headers) {
  const sheet = getSheet(name, headers);
  // Clear data rows only
  const last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).clearContent();
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/**
 * Append a single row.
 */
function appendRow(name, row, headers) {
  getSheet(name, headers).appendRow(row);
}

/**
 * Overwrite a specific data row (1-based data index → sheet row = idx + 1).
 */
function updateRow(name, idx, row) {
  const sheet = ss().getSheetByName(name);
  if (!sheet) return;
  sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
}

/**
 * Delete a data row by 0-based index.
 */
function deleteRow(name, idx) {
  const sheet = ss().getSheetByName(name);
  if (!sheet) return;
  sheet.deleteRow(idx + 2);   // +1 for header, +1 for 1-based indexing
}

// ── PULL ALL DATA ─────────────────────────────────────────────────────────────

function pullAllData() {
  ensureSheets();
  return {
    exps        : pullExpenses(),
    wrows       : pullWealth(),
    goals       : pullGoals(),
    activities  : pullActivities(),
    beauty      : pullBeauty(),
    calActs     : pullCalActs(),
    rhythm      : pullRhythm(),
    rules       : pullRules(),
    meals       : pullMeals(),
    ghsBudgets  : pullBudgets('ghs'),
    usdBudgets  : pullBudgets('usd'),
    gbpBudgets  : pullBudgets('gbp'),
    payChecks   : pullPayChecks(),
    pulledAt    : new Date().toISOString(),
  };
}

// ── PUSH ALL DATA ─────────────────────────────────────────────────────────────

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
  setMeta('lastPush', new Date().toISOString());
  return { ok: true, pushedAt: new Date().toISOString() };
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────

const EXP_HEADERS = ['month', 'date', 'category', 'description', 'amount', 'method'];

function expSheetName(curr) {
  return curr === 'ghs' ? SHEETS.EXPENSES_GHS
       : curr === 'usd' ? SHEETS.EXPENSES_USD
       : SHEETS.EXPENSES_GBP;
}

function pullExpenses() {
  const result = { ghs: [], usd: [], gbp: [] };
  ['ghs','usd','gbp'].forEach(curr => {
    const rows = readRows(expSheetName(curr));
    result[curr] = rows.map(r => ({
      month       : r[0] || '',
      date        : r[1] || '',
      category    : r[2] || '',
      description : r[3] || '',
      amount      : parseFloat(r[4]) || 0,
      method      : r[5] || '',
    }));
  });
  return result;
}

function pushExpenses(exps) {
  ['ghs','usd','gbp'].forEach(curr => {
    const rows = (exps[curr] || []).map(e => [
      e.month, e.date, e.category, e.description,
      e.amount, e.method || '',
    ]);
    writeRows(expSheetName(curr), rows, EXP_HEADERS);
  });
}

function saveExpense(payload) {
  // payload: { curr, exp, idx? }  idx = undefined means new row
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
  const { curr, idx } = payload;
  deleteRow(expSheetName(curr), idx);
  return { ok: true };
}

// ── WEALTH ────────────────────────────────────────────────────────────────────

const WEALTH_HEADERS = ['month','usd','gbp','ghs','debts','notes'];

function pullWealth() {
  return readRows(SHEETS.WEALTH).map(r => ({
    month  : r[0] || '',
    usd    : parseFloat(r[1]) || 0,
    gbp    : parseFloat(r[2]) || 0,
    ghs    : parseFloat(r[3]) || 0,
    debts  : parseFloat(r[4]) || 0,
    notes  : r[5] || '',
  }));
}

function pushWealth(rows) {
  const data = rows.map(r => [r.month, r.usd, r.gbp, r.ghs, r.debts, r.notes || '']);
  writeRows(SHEETS.WEALTH, data, WEALTH_HEADERS);
}

function saveWealth(payload) {
  const { row, idx } = payload;
  const r = [row.month, row.usd, row.gbp, row.ghs, row.debts, row.notes || ''];
  if (idx !== undefined && idx !== null && idx >= 0) {
    updateRow(SHEETS.WEALTH, idx, r);
  } else {
    appendRow(SHEETS.WEALTH, r, WEALTH_HEADERS);
  }
  return { ok: true };
}

// ── GOALS ─────────────────────────────────────────────────────────────────────

const GOAL_HEADERS = ['name','target','saved','deadline','notes','currency'];

function pullGoals() {
  return readRows(SHEETS.GOALS).map(r => ({
    n    : r[0] || '',
    t    : parseFloat(r[1]) || 0,
    s    : parseFloat(r[2]) || 0,
    d    : r[3] || '',
    notes: r[4] || '',
    curr : r[5] || 'usd',
  }));
}

function pushGoals(goals) {
  const data = goals.map(g => [g.n, g.t, g.s, g.d || '', g.notes || '', g.curr || 'usd']);
  writeRows(SHEETS.GOALS, data, GOAL_HEADERS);
}

function saveGoal(payload) {
  const { goal, idx } = payload;
  const r = [goal.n, goal.t, goal.s, goal.d || '', goal.notes || '', goal.curr || 'usd'];
  if (idx !== undefined && idx !== null && idx >= 0) {
    updateRow(SHEETS.GOALS, idx, r);
  } else {
    appendRow(SHEETS.GOALS, r, GOAL_HEADERS);
  }
  return { ok: true };
}

function deleteGoal(payload) {
  deleteRow(SHEETS.GOALS, payload.idx);
  return { ok: true };
}

// ── ACTIVITIES ────────────────────────────────────────────────────────────────

const ACT_HEADERS = ['month','icon','name','detail','budget'];

function pullActivities() {
  return readRows(SHEETS.ACTIVITIES).map(r => ({
    m: r[0] || '',
    i: r[1] || '',
    n: r[2] || '',
    d: r[3] || '',
    b: r[4] || '',
  }));
}

function pushActivitiesData(acts) {
  const data = acts.map(a => [a.m, a.i, a.n, a.d, a.b]);
  writeRows(SHEETS.ACTIVITIES, data, ACT_HEADERS);
}

function saveActivities(payload) {
  pushActivitiesData(payload.activities);
  return { ok: true };
}

// ── BEAUTY ────────────────────────────────────────────────────────────────────

const BEAUTY_HEADERS = ['month','service','details','cost'];

function pullBeauty() {
  return readRows(SHEETS.BEAUTY).map(r => ({
    m: r[0] || '',
    s: r[1] || '',
    d: r[2] || '',
    c: r[3] || '',
  }));
}

function pushBeautyData(beauty) {
  const data = beauty.map(b => [b.m, b.s, b.d, b.c]);
  writeRows(SHEETS.BEAUTY, data, BEAUTY_HEADERS);
}

function saveBeauty(payload) {
  pushBeautyData(payload.beauty);
  return { ok: true };
}

// ── CALENDAR ACTIVITIES ───────────────────────────────────────────────────────
// calActs is an object: { "2026-04-05": ["activity 1", "activity 2"], ... }
// Stored flat in the sheet: date | activity (one row per activity per date)

const CAL_HEADERS = ['date','activity'];

function pullCalActs() {
  const result = {};
  readRows(SHEETS.CAL_ACTS).forEach(r => {
    const date = r[0] || '';
    const act  = r[1] || '';
    if (!date) return;
    if (!result[date]) result[date] = [];
    if (act) result[date].push(act);
  });
  return result;
}

function pushCalActsData(calActs) {
  const rows = [];
  Object.entries(calActs).forEach(([date, acts]) => {
    (acts || []).forEach(act => rows.push([date, act]));
  });
  writeRows(SHEETS.CAL_ACTS, rows, CAL_HEADERS);
}

function saveCalActs(payload) {
  pushCalActsData(payload.calActs);
  return { ok: true };
}

// ── RHYTHM ────────────────────────────────────────────────────────────────────
// rhythm is array of [time, description]

const RHYTHM_HEADERS = ['time','description'];

function pullRhythm() {
  return readRows(SHEETS.RHYTHM).map(r => [r[0] || '', r[1] || '']);
}

function pushRhythmData(rhythm) {
  const data = rhythm.map(r => Array.isArray(r) ? [r[0], r[1]] : [r.time || '', r.desc || '']);
  writeRows(SHEETS.RHYTHM, data, RHYTHM_HEADERS);
}

function saveSimpleArray(sheetName, arr) {
  if (sheetName === SHEETS.RHYTHM) {
    pushRhythmData(arr);
  } else if (sheetName === SHEETS.RULES) {
    pushRulesData(arr);
  }
  return { ok: true };
}

// ── RULES ─────────────────────────────────────────────────────────────────────

const RULES_HEADERS = ['rule'];

function pullRules() {
  return readRows(SHEETS.RULES).map(r => r[0] || '').filter(Boolean);
}

function pushRulesData(rules) {
  const data = rules.map(r => [r]);
  writeRows(SHEETS.RULES, data, RULES_HEADERS);
}

// ── MEALS ─────────────────────────────────────────────────────────────────────

const MEAL_HEADERS = ['day','breakfast','lunch','dinner','groceries'];

function pullMeals() {
  return readRows(SHEETS.MEALS).map(r => ({
    day: r[0] || '',
    b  : r[1] || '',
    l  : r[2] || '',
    d  : r[3] || '',
    g  : r[4] || '',
  }));
}

function pushMealsData(meals) {
  const data = meals.map(m => [m.day, m.b, m.l, m.d, m.g]);
  writeRows(SHEETS.MEALS, data, MEAL_HEADERS);
}

function saveMeals(payload) {
  pushMealsData(payload.meals);
  return { ok: true };
}

// ── BUDGETS ───────────────────────────────────────────────────────────────────
// budgets are stored as key-value pairs: category_monthIndex → value
// Sheet columns: key | value

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
  const data = Object.entries(budgets).map(([k, v]) => [k, v]);
  writeRows(budSheetName(type), data, BUD_HEADERS);
}

function saveBudgets(payload) {
  // payload: { type: 'ghs'|'usd'|'gbp', budgets: { key: value } }
  pushBudgets(payload.type, payload.budgets);
  return { ok: true };
}

// ── PAY CHECKS ────────────────────────────────────────────────────────────────
// payChecks stored as: { "Apr 2026": { 0: true, 3: true }, ... }
// Sheet columns: month | idx | checked

const PAY_HEADERS = ['month','idx','checked'];

function pullPayChecks() {
  const result = {};
  readRows(SHEETS.PAY_CHECKS).forEach(r => {
    const month = r[0] || '';
    const idx   = r[1];
    const done  = r[2] === true || r[2] === 'TRUE' || r[2] === 1;
    if (!month) return;
    if (!result[month]) result[month] = {};
    result[month][idx] = done;
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
  // payload: { month, checks: { idx: bool } }
  // Merge with existing rather than overwrite all months
  const all = pullPayChecks();
  all[payload.month] = payload.checks;
  pushPayChecksData(all);
  return { ok: true };
}

// ── META ──────────────────────────────────────────────────────────────────────

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

// ── ENSURE ALL SHEETS EXIST ───────────────────────────────────────────────────

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
  getSheet(SHEETS.META,         ['key','value','updatedAt']);
}

// ── RESPONSE HELPER ───────────────────────────────────────────────────────────

function jsonResponse(data, code) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ════════════════════════════════════════════════════════════════════════════
// ONE-TIME SETUP — run this function manually once to initialise the sheet
// ════════════════════════════════════════════════════════════════════════════
function initialSetup() {
  ensureSheets();
  Logger.log('✓ All sheets created. Spreadsheet ID: ' + SPREADSHEET_ID);
  Logger.log('Next: Deploy as Web App and paste the URL into your HTML file.');
}

// ════════════════════════════════════════════════════════════════════════════
// MANUAL TEST — run in Apps Script editor to verify GET works
// ════════════════════════════════════════════════════════════════════════════
function testGet() {
  const result = pullAllData();
  Logger.log(JSON.stringify(result, null, 2));
}
