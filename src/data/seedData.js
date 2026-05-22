// ═══════════════════════════════════════════════════════════════
// LIFE OS — Seed Data & Constants
// All hardcoded defaults, categories, budgets, and reference data.
// Year is always computed dynamically from the system clock.
// ═══════════════════════════════════════════════════════════════

// ── Dynamic Year ──
// Every month key, goal deadline, and activity label derives from
// the current calendar year so nothing breaks when Jan 1 rolls over.
const YEAR = new Date().getFullYear();

// ── Month Reference Arrays ──
export const MKEYS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
export const ALL_MONTHS = MKEYS.map(m => `${m} ${YEAR}`);

// ═══════════════════════════════════════════════════════════════
// EXPENSE CATEGORIES
// ═══════════════════════════════════════════════════════════════

// 29 GHS expense categories
export const GHS_CATS = [
  'Rent',
  'Family Expenses & Allowance',
  'Electricity',
  'Drinking Water',
  'Water Bill (GWCL)',
  'Water Bill (PUMP)',
  'Food & Groceries',
  'Mall Groceries',
  'Data Bundle',
  'Airtime',
  'Subscriptions',
  'Home Care',
  'Toiletries (bulk)',
  'Health & Medication',
  'Cleaner (Saturdays x4)',
  'Beauty & Fashion',
  'Transportation & Fuel',
  'Car Maintenance',
  'Dining Out — Fufu',
  'Dining Out — Other',
  'Entertainment',
  'Bank charges GHS',
  'Gifts GHS',
  'Education GHS',
  'Savings GHS',
  'Travel',
  'Others',
  'Transfer',
  'Loans',
];

// 5 GHS income categories
export const GHS_INC_CATS = [
  'iAdjoa Services Income GHS',
  'Family Income GHS',
  'Babe Support GHS',
  'Investment Income GHS',
  'Gift & Other Income GHS',
];

// 17 USD expense categories
export const USD_CATS = [
  'GHS Expenses USD',
  'GBP Expenses USD',
  'Savings USD',
  'Cadana Savings',
  'Travel',
  'Loans Given USD',
  'Family Expenses & Allowance',
  'Food & Groceries',
  'Car Maintenance',
  'Bank charges USD',
  'Transfer',
  'Entertainment',
  'Gifts USD',
  'Education USD',
  'Transportation & Fuel',
  'Others USD',
  'Health & Medication',
];

// 5 USD income categories
export const USD_INC_CATS = [
  'Cadana Income USD',
  'Akuna Income USD',
  'Gifts USD',
  'Investment Income USD',
  'Other Income USD',
];

// 11 GBP expense categories
export const GBP_CATS = [
  'GHS Expenses GBP',
  'USD Expenses GBP',
  'Savings GBP',
  'Subscriptions',
  'Travel',
  'Loans',
  'Bank Charges GBP',
  'Entertainment',
  'Education GBP',
  'Others GBP',
  'Transfer',
];

// 5 GBP income categories
export const GBP_INC_CATS = [
  'Babe Support GBP',
  'Work Income GBP',
  'Investment Income GBP',
  'Gifts GBP',
  'Other Income GBP',
];


// ═══════════════════════════════════════════════════════════════
// BUDGET DEFAULTS
// Stored as flat objects: { "category_monthIndex": value }
// Month indices 0-11 map to Jan-Dec.
// ═══════════════════════════════════════════════════════════════

/**
 * Converts the legacy array-based budget definitions into a flat
 * key-value map that the store can read with getBudgetVal().
 * Only non-zero values are stored to keep the object compact.
 */
function buildBudgetMap(rows) {
  const map = {};
  rows.forEach(({ cat, m }) => {
    m.forEach((val, mi) => {
      if (val !== 0) map[`${cat}_${mi}`] = val;
    });
  });
  return map;
}

// ── GHS Budgets ──
// Income rows then expense rows flattened into one map
export const DEFAULT_BUDGETS_GHS = buildBudgetMap([
  // --- Income ---
  { cat: 'iAdjoa Services Income GHS', m: [2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000] },
  { cat: 'Family Income GHS',          m: [100,100,100,100,100,100,100,100,100,100,100,100] },
  { cat: 'Babe Support GHS',           m: [2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000] },
  { cat: 'Investment Income GHS',       m: [50,50,50,50,50,50,50,50,50,50,50,50] },
  { cat: 'Gift & Other Income GHS',    m: [200,200,200,200,200,200,200,200,200,200,200,200] },
  // --- Expenses ---
  { cat: 'Rent',                        m: [0,0,0,0,0,0,0,32400,0,0,0,0] },
  { cat: 'Family Expenses & Allowance', m: [3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000] },
  { cat: 'Electricity',                 m: [500,500,500,500,500,500,500,500,500,500,500,500] },
  { cat: 'Drinking Water',              m: [500,500,500,500,500,500,500,500,500,500,500,500] },
  { cat: 'Water Bill (GWCL)',           m: [100,100,100,100,100,100,100,100,100,100,100,100] },
  { cat: 'Water Bill (PUMP)',           m: [100,100,100,100,100,100,100,100,100,100,100,100] },
  { cat: 'Food & Groceries',           m: [1200,1200,1200,1200,1200,1200,1200,1200,1200,1200,1200,1200] },
  { cat: 'Mall Groceries',              m: [500,500,500,500,500,500,500,500,500,500,500,500] },
  { cat: 'Data Bundle',                 m: [250,250,250,250,250,250,250,250,250,250,250,250] },
  { cat: 'Airtime',                     m: [150,150,150,150,150,150,150,150,150,150,150,150] },
  { cat: 'Subscriptions',               m: [500,500,500,500,500,500,500,500,500,500,500,500] },
  { cat: 'Home Care',                   m: [200,200,200,200,200,200,200,200,200,200,200,200] },
  { cat: 'Toiletries (bulk)',           m: [200,200,200,200,200,200,200,200,200,200,200,200] },
  { cat: 'Health & Medication',         m: [300,300,300,300,300,300,300,300,300,300,300,300] },
  { cat: 'Cleaner (Saturdays x4)',      m: [400,400,400,400,400,400,400,400,400,400,400,400] },
  { cat: 'Beauty & Fashion',            m: [500,500,500,500,500,500,500,500,500,500,500,500] },
  { cat: 'Transportation & Fuel',       m: [1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000] },
  { cat: 'Car Maintenance',             m: [0,0,7000,0,3000,0,2000,0,0,2000,0,0] },
  { cat: 'Dining Out — Fufu',          m: [400,200,200,200,200,200,200,200,200,200,200,200] },
  { cat: 'Dining Out — Other',         m: [400,300,300,300,300,300,300,300,300,300,300,300] },
  { cat: 'Entertainment',               m: [1000,500,500,500,500,500,500,500,500,500,500,500] },
  { cat: 'Bank charges GHS',            m: [1000,500,500,500,500,500,500,500,500,500,500,500] },
  { cat: 'Gifts GHS',                   m: [200,150,150,150,150,150,150,150,150,150,150,150] },
  { cat: 'Education GHS',               m: [0,0,3000,0,3000,150,150,150,150,150,150,150] },
  { cat: 'Savings GHS',                 m: [2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000] },
  { cat: 'Travel',                       m: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { cat: 'Others',                       m: [1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000] },
  { cat: 'Transfer',                     m: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { cat: 'Loans',                        m: [0,0,0,0,0,0,0,0,0,0,0,0] },
]);

// ── USD Budgets ──
export const DEFAULT_BUDGETS_USD = buildBudgetMap([
  // --- Income ---
  { cat: 'Cadana Income USD',    m: [5900,2400,2400,2400,2400,2400,2400,2400,2400,2400,2400,3100] },
  { cat: 'Akuna Income USD',     m: [0,165,925,925,925,925,925,925,925,925,925,925] },
  { cat: 'Gifts USD',            m: [50,50,50,50,50,50,50,50,50,50,50,50] },
  { cat: 'Investment Income USD', m: [50,50,50,50,50,50,50,50,50,50,50,50] },
  { cat: 'Other Income USD',     m: [50,50,50,50,50,50,50,50,50,50,50,50] },
  // --- Expenses ---
  { cat: 'GHS Expenses USD',             m: [1540,1405,2405,1405,2005,1420,1620,4660,1420,1620,1420,1420] },
  { cat: 'GBP Expenses USD',             m: [521,521,521,521,521,521,521,521,521,521,521,521] },
  { cat: 'Savings USD',                  m: [0,0,200,1000,1000,1000,1000,1000,1000,1000,1000,1000] },
  { cat: 'Cadana Savings',               m: [1000,1000,1000,2200,2200,2200,1000,1000,1000,1000,1000,1700] },
  { cat: 'Travel',                        m: [500,2500,0,0,0,0,0,0,0,0,0,0] },
  { cat: 'Loans Given USD',              m: [1000,1000,500,0,0,0,0,0,0,0,0,0] },
  { cat: 'Family Expenses & Allowance',  m: [50,400,0,0,0,0,0,0,0,0,0,0] },
  { cat: 'Gifts USD',                    m: [0,0,0,0,300,0,0,0,0,0,0,0] },
  { cat: 'Others USD',                   m: [0,0,0,0,0,0,0,0,0,0,0,0] },
]);

// ── GBP Budgets ──
export const DEFAULT_BUDGETS_GBP = buildBudgetMap([
  // --- Income ---
  { cat: 'Babe Support GBP',      m: [50,50,50,50,50,50,50,50,50,50,50,50] },
  { cat: 'Work Income GBP',       m: [100,100,100,100,100,100,100,100,100,100,100,100] },
  { cat: 'Investment Income GBP', m: [10,10,10,10,10,10,10,10,10,10,10,10] },
  { cat: 'Gifts GBP',             m: [20,20,20,20,20,20,20,20,20,20,20,20] },
  { cat: 'Other Income GBP',      m: [50,50,50,50,50,50,50,50,50,50,50,50] },
  // --- Expenses ---
  { cat: 'Savings GBP',        m: [500,500,500,500,500,500,500,500,500,500,500,500] },
  { cat: 'Travel',              m: [0,1500,0,0,0,0,0,0,0,0,0,0] },
  { cat: 'Loans',               m: [200,200,200,200,200,200,200,200,200,200,200,200] },
  { cat: 'Subscriptions',       m: [5,10,5,5,5,5,5,5,5,5,5,5] },
  { cat: 'GHS Expenses GBP',   m: [10,10,10,10,10,10,10,10,10,10,10,10] },
  { cat: 'USD Expenses GBP',   m: [10,10,10,10,10,10,10,10,10,10,10,10] },
  { cat: 'Others GBP',          m: [100,100,100,100,100,100,100,100,100,100,100,100] },
]);


// ═══════════════════════════════════════════════════════════════
// SAVINGS GOALS
// Deadlines use the dynamic YEAR.
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_GOALS = [
  { n: 'Emergency Fund (6 months)',  t: 6000,  s: 500,     d: `${YEAR}-06-30`, notes: '',                                        curr: 'usd' },
  { n: 'Treasury Bill & Stocks',     t: 24000, s: 4000,    d: `${YEAR}-12-31`, notes: '',                                        curr: 'ghs' },
  { n: 'Education Fund',             t: 1000,  s: 0,       d: `${YEAR}-12-31`, notes: '',                                        curr: 'usd' },
  { n: 'GBP Savings',                t: 5000,  s: 931,     d: `${YEAR}-12-31`, notes: '£500 from Mikael',                       curr: 'gbp' },
  { n: 'USD Savings',                t: 10000, s: 0,       d: `${YEAR}-12-31`, notes: '',                                        curr: 'usd' },
  { n: 'Travel / Personal Treat',    t: 3000,  s: 0,       d: `${YEAR}-12-31`, notes: '',                                        curr: 'usd' },
  { n: 'Couple Savings (GBP)',       t: 1500,  s: 160,     d: `${YEAR}-12-31`, notes: '',                                        curr: 'gbp' },
  { n: '2025 Year Savings Close',    t: 6725,  s: 3148.94, d: `${YEAR}-12-31`, notes: '$3,225 Popout + $3,500 Monaa',           curr: 'usd' },
  { n: 'Loan Collection',            t: 20900, s: 0,       d: `${YEAR}-12-31`, notes: 'Popout Office Loan',                     curr: 'usd' },
];


// ═══════════════════════════════════════════════════════════════
// WEALTH TRACKER — 12 monthly snapshots
// Jan–Apr seeded with real opening balances; May–Dec zeroed.
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_WEALTH = [
  { month: `Jan ${YEAR}`, usd: 0,    gbp: 31,  ghs: -0.89, debts: 0, notes: '' },
  { month: `Feb ${YEAR}`, usd: 1000, gbp: 160, ghs: 3999.98, debts: 0, notes: '' },
  { month: `Mar ${YEAR}`, usd: 500,  gbp: 700, ghs: 0,     debts: 0, notes: '' },
  { month: `Apr ${YEAR}`, usd: 0,    gbp: 0,   ghs: 35000, debts: 0, notes: '' },
  { month: `May ${YEAR}`, usd: 0,    gbp: 0,   ghs: 0,     debts: 0, notes: '' },
  { month: `Jun ${YEAR}`, usd: 0,    gbp: 0,   ghs: 0,     debts: 0, notes: '' },
  { month: `Jul ${YEAR}`, usd: 0,    gbp: 0,   ghs: 0,     debts: 0, notes: '' },
  { month: `Aug ${YEAR}`, usd: 0,    gbp: 0,   ghs: 0,     debts: 0, notes: '' },
  { month: `Sep ${YEAR}`, usd: 0,    gbp: 0,   ghs: 0,     debts: 0, notes: '' },
  { month: `Oct ${YEAR}`, usd: 0,    gbp: 0,   ghs: 0,     debts: 0, notes: '' },
  { month: `Nov ${YEAR}`, usd: 0,    gbp: 0,   ghs: 0,     debts: 0, notes: '' },
  { month: `Dec ${YEAR}`, usd: 0,    gbp: 0,   ghs: 0,     debts: 0, notes: '' },
];


// ═══════════════════════════════════════════════════════════════
// LIFE — Activities, Beauty, Rhythm, Rules, Meals
// ═══════════════════════════════════════════════════════════════

// ── Planned Activities (5 entries across the year) ──
export const DEFAULT_ACTIVITIES = [
  { m: `Mar ${YEAR}`, i: '🚶', n: 'Daily Walks (Mon–Fri)',      d: '30 min at 10:00am',                           b: 'FREE' },
  { m: `Mar ${YEAR}`, i: '🥾', n: 'Hike → Pool → Fufu (Sat)', d: 'Wake 5:30am. Hike 6–9am. Pool. Fufu.',       b: '~GHS 300' },
  { m: `Jun ${YEAR}`, i: '🔧', n: 'Car Maintenance',             d: '3-month service due',                         b: '~GHS 2,000' },
  { m: `Sep ${YEAR}`, i: '🔧', n: 'Car Maintenance',             d: '6-month service due',                         b: '~GHS 2,000' },
  { m: `Dec ${YEAR}`, i: '🎉', n: 'Year-End Celebration',        d: 'Dinner with partner/girls',                   b: '~GHS 400' },
];

// ── Beauty Calendar (10 entries, Mar–Dec) ──
export const DEFAULT_BEAUTY = [
  { m: `Mar ${YEAR}`, s: 'Rasta braids',                   d: 'Day 5–6: GHS 150. Day 20–22: touch-up GHS 150. Toiletries GHS 200.', c: 'GHS 500' },
  { m: `Apr ${YEAR}`, s: 'Cornrows',                       d: 'Day 5–6 and Day 20–22.',                                             c: 'GHS 300' },
  { m: `May ${YEAR}`, s: 'Cornrows + Toiletries',          d: 'Day 5–6 and Day 20–22. Restock.',                                    c: 'GHS 400' },
  { m: `Jun ${YEAR}`, s: 'Cornrows + Quarterly Dye 🎨',   d: 'Day 5–6: dye + cornrows. Day 20–22: touch-up.',                      c: 'GHS 500–600' },
  { m: `Jul ${YEAR}`, s: 'Braids',                         d: 'Day 5–6 and Day 20–22. Toiletries.',                                 c: 'GHS 500' },
  { m: `Aug ${YEAR}`, s: 'Cornrows',                       d: 'Day 5–6 and Day 20–22.',                                             c: 'GHS 300' },
  { m: `Sep ${YEAR}`, s: 'Cornrows + Quarterly Dye 🎨',   d: 'Day 5–6: dye. Day 20–22: touch-up.',                                 c: 'GHS 500–600' },
  { m: `Oct ${YEAR}`, s: 'Braids',                         d: 'Day 5–6 and Day 20–22.',                                             c: 'GHS 500' },
  { m: `Nov ${YEAR}`, s: 'Cornrows (×2)',                  d: 'Day 5–6 and Day 20–22.',                                             c: 'GHS 300' },
  { m: `Dec ${YEAR}`, s: 'Wave on ✨ + Festive Dye 🎨',   d: 'Festive season style. Treat yourself!',                               c: 'GHS 600–700' },
];

// ── Daily Rhythm (13 entries: 9 AM → 3 AM) ──
export const DEFAULT_RHYTHM = [
  ['9:00 AM',  '☀️ Wake up. Drink water. Set ONE intention for the day.'],
  ['9:15 AM',  '🪥 Morning freshen up / skincare. 10 minutes max.'],
  ['9:45 AM',  '🍳 BREAKFAST — sit down at the table. No screens.'],
  ['10:00 AM', '🚶 MORNING WALK — 30 minutes, non-negotiable weekdays.'],
  ['10:30 AM', '💻 Work session 1 — deep work, creative work.'],
  ['1:00 PM',  '🍛 LUNCH — stop work. Eat properly.'],
  ['1:30 PM',  '💻 Work session 2 — admin, emails, calls.'],
  ['4:00 PM',  '📝 Wind down. Save work. Note top 3 for tonight.'],
  ['5:00 PM',  "😴 NAP — your body's natural rhythm. Honour it."],
  ['9:00 PM',  '🌙 Wake from nap. Dinner. Rehydrate.'],
  ['9:30 PM',  '💻 Evening session — most creative time.'],
  ['2:00 AM',  "📋 Wrap up. Write tomorrow's top 3. Check expenses."],
  ['3:00 AM',  '🛌 SLEEP. Rest.'],
];

// ── Personal Rules (10 rules) ──
export const DEFAULT_RULES = [
  'Pay ALL bills on Day 1 every month. The month starts clean or it does not start at all.',
  'Cook 3 times a week. If you did not cook, eat from what you cooked — not delivery.',
  'Walk every weekday morning at 10am. Even 20 minutes counts. Non-negotiable.',
  'Shop only on Saturdays for fresh produce. No mid-week runs — they kill the budget.',
  'Your Big 3 Saturday activities are already planned. No unplanned outings.',
  'Three meals a day. Every day. Skipping meals leads to takeout cravings.',
  'No impulse buying. If not on your list, wait 48 hours. Most impulses disappear.',
  'Log every expense same day. Even GHS 5 kelewele. 30 seconds.',
  'On Day 30, review the month. No guilt — just data. What improves next month?',
  'On Day 31, transfer savings and celebrate. You planned it. You did it. That is a win.',
];

// ── Meal Plan (7-day, Ghanaian food) ──
export const DEFAULT_MEALS = [
  { day: 'Monday',    b: 'Oats & milk',           l: 'Waakye (buy)',          d: 'Rice & stew',         g: 'Check fridge' },
  { day: 'Tuesday',   b: 'Bread & fried egg',     l: 'Rice & stew',          d: 'Rice / kelewele',     g: '' },
  { day: 'Wednesday', b: 'Koko with Koose',       l: 'Waakye with protein',  d: 'Rice & stew',         g: 'Tomatoes, rice, chicken/fish' },
  { day: 'Thursday',  b: 'Koko with Koose',       l: 'Waakye',               d: 'Banku & okro',        g: 'Cornmeal, okro' },
  { day: 'Friday',    b: 'Koko with Koose',       l: 'Yam and stew',         d: 'Jollof rice',         g: 'Garden eggs, yam' },
  { day: 'Saturday',  b: 'Egg & bread & coffee',  l: '—',                    d: 'Fufu & light soup',   g: '🛒 WEEKLY FRESH SHOP — GHS 300' },
  { day: 'Sunday',    b: 'Oats & milk',           l: 'Fufu with light soup', d: 'Oat & milk',          g: '' },
];


// ═══════════════════════════════════════════════════════════════
// PAYMENT SCHEDULE
// 16-row reference for when bills are due each month.
// ═══════════════════════════════════════════════════════════════

export const PAY_SCHEDULE = [
  ['Day 1',     'Rent',                            'GHS 3,000',          'Transfer to landlord'],
  ['Day 1',     'Family allowance & expenses',     'GHS 3,000',          'Parents + family obligations'],
  ['Day 1',     'Electricity (ECG prepaid)',        'GHS 500',            'Mobile money top-up'],
  ['Day 1',     'Drinking water delivery',          'GHS 500',            'Call supplier to deliver'],
  ['Day 1',     'Data bundle (alternate months)',   'GHS 500 or GHS 0',  'Mar/May/Jul/Sep/Nov only'],
  ['Day 1–2',   'Mall grocery shopping',            'GHS 500',            'Stick to your list!'],
  ['Day 3',     'Toiletries bulk buy',              'GHS 200',            'Soap, lotion, toothpaste, sanitary'],
  ['Day 5–6',   'Salon — cornrows for wig',        'GHS 150',            'Book appointment in advance'],
  ['Day 9',     'Home care payment',                'GHS 100',            ''],
  ['Day 14–15', 'Water bill (GWCL)',               'GHS 100',            'MUST be paid by Day 15'],
  ['Day 20–22', 'Salon touch-up (if needed)',       'GHS 100–150',        'Re-do if cornrows loosening'],
  ['Day 24',    'Phone charges',                    'GHS 100',            ''],
  ['Day 24',    'Airtime top-up',                   'GHS 150',            ''],
  ['Day 27',    'Final Saturday fresh groceries',   'GHS 300',            'Last weekly shop of month'],
  ['Day 30',    'Full month budget review',         '—',                  'Tally all Expense Tracker entries'],
  ['Day 31',    'Transfer savings to account',      'Any surplus',        'Into savings / investment account'],
];


// ═══════════════════════════════════════════════════════════════
// TASK MANAGER — Constants & Seed Tasks
// ═══════════════════════════════════════════════════════════════

// 17 work types with ids, labels, and emoji icons
export const WORK_TYPES = [
  { id: 'accounting',    l: 'Accounting',        ic: '📊' },
  { id: 'documentation', l: 'Documentation',     ic: '📄' },
  { id: 'strategy',      l: 'Strategy',          ic: '♟️' },
  { id: 'internal-ctrl', l: 'Internal Control',  ic: '🔒' },
  { id: 'compliance',    l: 'Compliance',        ic: '✅' },
  { id: 'policy',        l: 'Policy',            ic: '📋' },
  { id: 'treasury',      l: 'Treasury',          ic: '💰' },
  { id: 'corp-finance',  l: 'Corporate Finance', ic: '🏦' },
  { id: 'tax',           l: 'Tax',               ic: '🧾' },
  { id: 'risk',          l: 'Risk',              ic: '⚠️' },
  { id: 'life',          l: 'Life & Wellbeing',  ic: '🌿' },
  { id: 'support',       l: 'Support',           ic: '🤝' },
  { id: 'education',     l: 'Education',         ic: '📚' },
  { id: 'operations',    l: 'Operations',        ic: '⚙️' },
  { id: 'legal',         l: 'Legal',             ic: '⚖️' },
  { id: 'hr',            l: 'Human Resources',   ic: '👥' },
  { id: 'general',       l: 'General',           ic: '📌' },
];

// Priority levels
export const PRIORITIES = ['High', 'Medium', 'Low'];

// Task statuses
export const STATUSES = ['To Do', 'In Progress', 'Done'];

// ── Roles ──
// Each role maps to a life domain with emoji and theme color
export const ROLES = [
  { id: 'work',     name: 'Work',          org: 'Cadana',  emoji: '💼', color: 'var(--accent-blue)' },
  { id: 'side',     name: 'Side Business', org: 'ICUNI',   emoji: '🚀', color: 'var(--accent-purple)' },
  { id: 'studies',  name: 'Studies',        org: 'Self',    emoji: '📚', color: 'var(--accent-teal)' },
  { id: 'personal', name: 'Personal',      org: '',        emoji: '🧘', color: 'var(--accent-gold)' },
  { id: 'health',   name: 'Health',         org: '',        emoji: '❤️', color: 'var(--accent-rose)' },
  { id: 'finance',  name: 'Finance',        org: '',        emoji: '💰', color: 'var(--accent-gold)' },
  { id: 'family',   name: 'Family',         org: '',        emoji: '👨‍👩‍👧', color: 'var(--accent-teal)' },
  { id: 'projects', name: 'Projects',       org: '',        emoji: '🔧', color: 'var(--accent-purple)' },
];

// ── Default Tasks — 17 example tasks across roles ──
// Each task has a unique id, title, description, role, priority,
// status, workType, due date, and created timestamp.
let _taskId = 0;
function mkTask(title, desc, role, priority, status, workType, dueDaysFromNow) {
  const due = new Date();
  due.setDate(due.getDate() + dueDaysFromNow);
  return {
    id: `seed_${++_taskId}`,
    title,
    desc,
    role,
    priority,
    status,
    workType,
    due: due.toISOString().slice(0, 10),
    created: new Date().toISOString(),
    completed: status === 'Done' ? new Date().toISOString() : null,
  };
}

export const DEFAULT_TASKS = [
  // Work — Cadana
  mkTask('Prepare monthly reconciliation',         'Reconcile all bank statements against ledger entries for the month.',     'work', 'High',   'To Do',       'accounting',    3),
  mkTask('Update internal controls checklist',      'Review and update the SOX-aligned internal control checklist.',          'work', 'Medium', 'In Progress', 'internal-ctrl', 7),
  mkTask('Draft Q2 compliance report',              'Compile regulatory compliance findings for quarterly board review.',      'work', 'High',   'To Do',       'compliance',   14),
  mkTask('Review transfer pricing policy',          'Assess current transfer pricing structure for new entity.',               'work', 'Medium', 'To Do',       'policy',       21),
  mkTask('Tax filing preparation — Ghana',         'Gather all supporting documents for annual GRA filing.',                  'work', 'High',   'To Do',       'tax',          30),

  // Side Business — ICUNI
  mkTask('Update iAdjoa Services website',          'Refresh portfolio page and add new case studies.',                        'side', 'Medium', 'To Do',       'general',       5),
  mkTask('Invoice March clients',                    'Send invoices for all completed March consulting engagements.',          'side', 'High',   'Done',        'accounting',   -5),
  mkTask('Strategic plan for Q3',                    'Outline service expansion and revenue targets for Q3.',                   'side', 'Low',    'To Do',       'strategy',     28),

  // Studies
  mkTask('Complete corporate finance module',        'Finish Coursera corporate finance specialisation module 4.',             'studies', 'Medium', 'In Progress', 'education',  10),
  mkTask('Read "Thinking, Fast and Slow"',          'Finish remaining chapters and write personal takeaways.',                 'studies', 'Low',    'To Do',       'general',    60),

  // Personal
  mkTask('Plan birthday celebration',                'Decide venue, guest list, and budget for birthday dinner.',               'personal', 'Medium', 'To Do',    'life',        45),
  mkTask('Organise digital files',                   'Clean up Downloads and Documents folders, archive old files.',            'personal', 'Low',    'To Do',    'general',     14),

  // Health
  mkTask('Schedule annual check-up',                 'Book appointment with Dr. Mensah for annual physical.',                   'health', 'High',   'To Do',    'life',         7),
  mkTask('Restock supplements',                      'Order Vitamin D, iron, and multivitamins from pharmacy.',                 'health', 'Low',    'To Do',    'life',        10),

  // Finance
  mkTask('Review investment portfolio',              'Check stock and T-bill performance, rebalance if needed.',                'finance', 'High',  'To Do',    'treasury',    14),
  mkTask('Update wealth tracker for May',            'Enter end-of-month balances across all three currencies.',                'finance', 'Medium','To Do',    'accounting',   2),

  // Family
  mkTask('Send monthly family allowance',            'Transfer GHS 3,000 on Day 1. Confirm receipt.',                           'family', 'High',  'To Do',    'general',      1),
];
