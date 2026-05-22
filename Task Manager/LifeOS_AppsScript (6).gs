// ╔══════════════════════════════════════════════════════════════════╗
// ║                  LifeOS — Google Apps Script                    ║
// ║              Backend for Google Sheets Sync                     ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  SETUP INSTRUCTIONS (do this once per person):                  ║
// ║                                                                  ║
// ║  1. Go to sheets.google.com → create a new blank spreadsheet    ║
// ║     Name it anything you like, e.g. "My LifeOS Tasks"           ║
// ║                                                                  ║
// ║  2. In the spreadsheet click:                                    ║
// ║     Extensions → Apps Script                                    ║
// ║                                                                  ║
// ║  3. Delete ALL existing code in the editor                      ║
// ║     Then paste this entire file and click Save (💾)             ║
// ║                                                                  ║
// ║  4. Click Deploy → New Deployment                               ║
// ║     • Click the gear icon ⚙️ next to "Type"                     ║
// ║     • Select Web App                                            ║
// ║     • Description: LifeOS Sync (any name)                       ║
// ║     • Execute as: Me                                            ║
// ║     • Who has access: Anyone                                    ║
// ║     • Click Deploy                                              ║
// ║                                                                  ║
// ║  5. Authorise the app when prompted (click through permissions) ║
// ║                                                                  ║
// ║  6. Copy the Web App URL — it looks like:                       ║
// ║     https://script.google.com/macros/s/ABC123.../exec           ║
// ║                                                                  ║
// ║  7. Open LifeOS_App.html in your browser                        ║
// ║     During setup (Step 3 of the wizard), paste the URL          ║
// ║     Or go to ⚙️ Settings → Sync tab to add it later            ║
// ║                                                                  ║
// ║  NOTE: Each person needs their OWN Google Sheet and deployment  ║
// ║  Your data is private — stored only in your own Google account  ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── CONFIGURATION ──────────────────────────────────────────────────
const SHEET_NAME = 'LifeOS_Tasks';

// All columns stored in the sheet (must match this order exactly)
const HEADERS = [
  'id', 'title', 'role', 'workType', 'priority', 'status',
  'due', 'startDate', 'notes', 'totalDeliverables', 'targetDeliverables',
  'completedDeliverables', 'assignedTo', 'delegatedTo', 'parentId',
  'recurrence', 'recurrEnd', 'createdAt'
];


// ── GET: Read all tasks ─────────────────────────────────────────────
function doGet(e) {
  try {
    ensureSheet();
    return respond({ success: true, tasks: getAllTasks() });
  } catch (err) {
    return respond({ success: false, error: err.message });
  }
}


// ── POST: All write operations ──────────────────────────────────────
function doPost(e) {
  try {
    ensureSheet();
    const body = JSON.parse(e.postData.contents || '{}');

    switch (body.action) {
      case 'add':       return respond({ success: true, task:   addTask(body.task) });
      case 'batchAdd':  return respond({ success: true, tasks:  batchAdd(body.tasks) });
      case 'update':    return respond({ success: true, task:   updateTask(body.task) });
      case 'delete':    return respond({ success: true, id:     deleteTask(body.id) });
      case 'syncAll':   return respond({ success: true, result: syncAll(body.tasks) });
      default:          return respond({ success: false, error: 'Unknown action: ' + body.action });
    }
  } catch (err) {
    return respond({ success: false, error: err.message });
  }
}


// ── SHEET SETUP ─────────────────────────────────────────────────────
function ensureSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);

    // Write and style the header row
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange
      .setFontWeight('bold')
      .setFontColor('#ffffff')
      .setBackground('#1a237e')
      .setHorizontalAlignment('center');

    // Freeze header and set column widths
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 160);

    // Make the sheet slightly prettier
    sheet.setTabColor('#4f8ef7');
  }

  return sheet;
}


// ── READ ─────────────────────────────────────────────────────────────
function getAllTasks() {
  const sheet = ensureSheet();
  const data  = sheet.getDataRange().getValues();

  if (data.length <= 1) return []; // only header row

  return data.slice(1)
    .map(row => rowToObject(row))
    .filter(task => task.id && task.id.trim() !== ''); // skip blank rows
}

function rowToObject(row) {
  const obj = {};
  HEADERS.forEach((header, index) => {
    const val = row[index];
    obj[header] = (val !== undefined && val !== null) ? String(val) : '';
  });
  return obj;
}

function objectToRow(task) {
  return HEADERS.map(header => {
    const val = task[header];
    return (val !== undefined && val !== null) ? val : '';
  });
}


// ── CREATE ───────────────────────────────────────────────────────────
function addTask(task) {
  const sheet = ensureSheet();

  if (!task.id || task.id.trim() === '') {
    task.id = 'T' + new Date().getTime().toString(36) +
              Math.random().toString(36).slice(2, 5);
  }
  if (!task.createdAt) {
    task.createdAt = new Date().toISOString();
  }

  sheet.appendRow(objectToRow(task));
  return task;
}

function batchAdd(tasks) {
  if (!tasks || tasks.length === 0) return [];

  const sheet = ensureSheet();
  const now   = new Date().toISOString();

  const rows = tasks.map(task => {
    if (!task.id || task.id.trim() === '') {
      // Generate a unique-enough ID for each task
      task.id = 'T' + new Date().getTime().toString(36) +
                Math.random().toString(36).slice(2, 5);
    }
    if (!task.createdAt) task.createdAt = now;
    return objectToRow(task);
  });

  // Write all rows in one call (much faster than looping appendRow)
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, HEADERS.length).setValues(rows);

  return tasks;
}


// ── UPDATE ───────────────────────────────────────────────────────────
function updateTask(task) {
  const sheet = ensureSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === task.id) {
      // Preserve original createdAt if not supplied
      if (!task.createdAt) {
        task.createdAt = data[i][HEADERS.indexOf('createdAt')] || new Date().toISOString();
      }
      sheet.getRange(i + 1, 1, 1, HEADERS.length).setValues([objectToRow(task)]);
      return task;
    }
  }

  // Task not found — insert it (upsert behaviour)
  return addTask(task);
}


// ── DELETE ───────────────────────────────────────────────────────────
function deleteTask(id) {
  const sheet = ensureSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return id;
    }
  }
  return id; // Return ID even if not found (idempotent)
}


// ── SYNC ALL (full replace) ──────────────────────────────────────────
// Used when first connecting to push all local tasks to the sheet,
// or when you want a full clean sync.
function syncAll(tasks) {
  const sheet = ensureSheet();

  // Delete all existing data rows (keep header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  // Write new tasks if any
  if (tasks && tasks.length > 0) {
    batchAdd(tasks);
  }

  return { count: tasks ? tasks.length : 0 };
}


// ── RESPONSE HELPER ──────────────────────────────────────────────────
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── TEST FUNCTION (run manually from the editor to check setup) ──────
function testSetup() {
  ensureSheet();
  const tasks = getAllTasks();
  Logger.log('✅ Sheet ready. Tasks found: ' + tasks.length);
  Logger.log('First task: ' + JSON.stringify(tasks[0] || 'none'));
}
