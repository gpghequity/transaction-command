require('dotenv').config({ path: 'C:\\Users\\gpghe\\.env.shared' });
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });

// ─── VERSION + DEPLOY TIMESTAMP ───────────────────────────────────────────
// Per brief: update both BEFORE every Railway push.
// APP_VERSION increments by 0.1 on every push (v1.0 → v1.1 → v1.2 ...)
// LAST_DEPLOY is the timestamp of the last code upload (not runtime).
const APP_VERSION = 'v1.1';
const LAST_DEPLOY = 'April 17, 2026 5:53 PM EST';
// ──────────────────────────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1);
app.use(generalLimiter);
// Port override per operator preamble (3003 — avoids Tether/REI/others)
const PORT = process.env.PORT || 3003;

// Views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'transaction-command-dev',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
}));

// Template locals (version, timestamp, app name, auth flag)
app.use((req, res, next) => {
  res.locals.version = APP_VERSION;
  res.locals.lastUpdated = LAST_DEPLOY;
  res.locals.appName = 'Transaction Command';
  res.locals.isLoggedIn = !!(req.session && req.session.isAuthed);
  res.locals.currentPath = req.path;
  next();
});

// Multer (accepts but does not process per brief)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// ─── EARLY ACCESS (v2 promo) ─────────────────────────────────────────────
// In-memory capture of email signups for Transaction Command v2 preview.
const earlyAccessRequests = [];

const NOTIFY_TO = 'steve@goodpeoplegoodhomes.com';

let mailTransporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
} else {
  console.warn('[mail] GMAIL_USER / GMAIL_APP_PASSWORD not set — notifications will be logged only.');
}

// Daily cap — 10 early-access notification emails/day max
let _tcDailySent = 0;
let _tcDailyDate = '';
const TC_DAILY_CAP = 5;
function tcCapReached() {
  const today = new Date().toISOString().slice(0, 10);
  if (_tcDailyDate !== today) { _tcDailySent = 0; _tcDailyDate = today; }
  return _tcDailySent >= TC_DAILY_CAP;
}

function sendEarlyAccessNotification({ feature, email, timestamp }) {
  const subject = `Early Access - Transaction Command v2 - ${feature}`;
  const body = `Early access request received for ${feature} from ${email} at ${timestamp}`;
  if (!mailTransporter) {
    console.log('[mail:skipped]', subject, '—', body);
    return Promise.resolve({ skipped: true });
  }
  if (tcCapReached()) {
    console.log('[mail:cap] daily cap reached — early access notification skipped:', subject);
    return Promise.resolve({ skipped: true, reason: 'daily_cap' });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (_tcDailyDate !== today) { _tcDailySent = 0; _tcDailyDate = today; }
  _tcDailySent++;
  return mailTransporter.sendMail({
    from: process.env.GMAIL_USER,
    to: NOTIFY_TO,
    subject,
    text: body
  });
}

// Auth
const VALID_USER = 'tccommand';
const VALID_PASS = process.env.ADMIN_PASSWORD || '';

function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthed) return next();
  return res.redirect('/login');
}

// ─── ROUTES ───────────────────────────────────────────────────────────────

app.get('/login', (req, res) => {
  if (req.session.isAuthed) return res.redirect('/dashboard');
  res.render('layout', {
    page: 'login',
    title: 'Login — Transaction Command',
    error: null
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === VALID_USER && password === VALID_PASS) {
    req.session.isAuthed = true;
    return res.redirect('/dashboard');
  }
  res.status(401).render('layout', {
    page: 'login',
    title: 'Login — Transaction Command',
    error: 'Invalid credentials. Try again.'
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Dashboard
app.get(['/', '/dashboard'], requireAuth, (req, res) => {
  const transactions = [
    { address: '215 Pine Street, Kingston PA',    type: 'AOS',       agent: 'Naire Crayton',  price: '$142,500', status: 'Closing: May 15', compliance: 'CONDITIONAL' },
    { address: '88 Willow Ave, Wilkes-Barre PA',  type: 'Listing',   agent: 'Ryan Franco',    price: '$89,000',  status: 'Active',          compliance: 'PASS' },
    { address: '2200 Industrial Dr, Columbus OH', type: 'Wholesale', agent: 'Alex Torres',    price: '$325,000', status: 'Closing: May 3',  compliance: 'FAIL' },
    { address: '47 Maple Lane, Scranton PA',      type: 'Buyer Rep', agent: 'Drew Mitchell',  price: '$215,000', status: 'Active',          compliance: 'PASS' }
  ];

  const stats = [
    { label: 'Active Transactions',   value: '4' },
    { label: 'Pending Review',        value: '1' },
    { label: 'Docs Checked This Month', value: '23' },
    { label: 'Compliance Score',      value: '94%' }
  ];

  const v2Features = [
    {
      icon: '📄',
      name: 'PDF Contract Ingestion',
      short: 'Drop any executed contract PDF from zipForm, Dotloop, or manual upload. AI identifies document type and extracts key terms.',
      long: 'Transaction Command v2 accepts executed contracts from any source. No form software dependencies — we work with whatever your agents already use. Drop the PDF, we handle the rest. Launching Q2 2026.'
    },
    {
      icon: '✓',
      name: 'AI Compliance Review',
      short: 'Every clause, every disclosure, every required field reviewed by Claude against PA and Ohio compliance rules in seconds.',
      long: 'Compliance review runs automatically the moment a contract is uploaded. Pass/conditional/fail decision delivered in under 30 seconds with specific flags on every missing or non-compliant item. Launching Q2 2026.'
    },
    {
      icon: '⚠️',
      name: 'Missing Document Detection',
      short: 'Automatic detection of required addenda, disclosures, and supporting documents based on deal type and state.',
      long: 'Lead paint disclosure missing on a pre-1978 property? Flagged. Seller\'s Property Disclosure absent on a PA deal? Flagged. Before your broker spends time reviewing, the system has already identified what\'s missing. Launching Q2 2026.'
    },
    {
      icon: '✍️',
      name: 'E-Signature Routing',
      short: 'Send contracts for signature via built-in Dropbox Sign integration. Track signature progress in real-time. Auto-reminders.',
      long: 'For contracts originated inside Transaction Command — wholesale assignments, seller finance addenda, commercial deals — signature routing is built in. Dashboard shows real-time status with automatic reminders to slow signers. Launching Q2 2026.'
    },
    {
      icon: '📝',
      name: 'Wholesale and Creative Contract Generator',
      short: 'Original contract templates for wholesale assignments, JV agreements, seller finance, and commercial deals — generated and signed in one platform.',
      long: 'PAR forms stay in zipForm. Transaction Command generates the contracts PAR doesn\'t cover: wholesale assignments, JV co-wholesale, seller finance notes, commercial purchase agreements. Full template library with dynamic field insertion. Launching Q2 2026.'
    },
    {
      icon: '👔',
      name: 'Broker Sign-Off Workflow',
      short: 'Every executed file routes through the broker for final review. Compliance notes attached. Audit trail preserved.',
      long: 'Nothing closes without broker review. Transaction Command routes every fully-executed contract through a mandatory broker sign-off stage. Broker reviews compliance flags, adds notes, signs off or kicks back to agent. Full audit trail for every action. Launching Q2 2026.'
    },
    {
      icon: '🔒',
      name: 'Secure 7-Year Archive',
      short: 'PA-compliant document retention, encrypted storage, searchable archive, audit-ready export — all built in.',
      long: 'PA real estate law requires 7-year retention of transaction records. Transaction Command stores every contract, disclosure, addendum, and correspondence in encrypted Google Drive-backed storage. Search by agent, property, date, or status. Export any transaction file for PA State Real Estate Commission audits. Launching Q2 2026.'
    },
    {
      icon: '💰',
      name: 'Commission Disbursement Instructions',
      short: 'Auto-generated disbursement instructions to title. Commission allocated per Gorilla compensation plan. Cross-checked against broker records.',
      long: 'Once broker signs off, Transaction Command generates the commission disbursement sheet for title/escrow. Pulls compensation plan data (Plan A/B/C) to calculate exact splits. Cross-checks against the Commission Reference Document. Launching Q2 2026.'
    }
  ];

  res.render('layout', {
    page: 'dashboard',
    title: 'Dashboard — Transaction Command',
    transactions,
    stats,
    v2Features
  });
});

// Document Check
app.get('/document-check', requireAuth, (req, res) => {
  res.render('layout', {
    page: 'document-check',
    title: 'Document Check — Transaction Command'
  });
});

app.post('/document-check', requireAuth, upload.single('document'), (req, res) => {
  // Multer accepted the file; we do NOT process it. Return the simulated report.
  const docType = (req.body.doc_type || '').trim();
  const report = getSimulatedReport(docType);

  // Clean up the uploaded temp file since we're not storing
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, () => {});
  }

  res.json(report);
});

// Early Access capture (v2 promo)
app.post('/early-access', requireAuth, async (req, res) => {
  const email = (req.body.email || '').toString().trim();
  const feature = (req.body.feature || 'Full Platform').toString().trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  const timestamp = new Date().toISOString();
  earlyAccessRequests.push({ email, feature, timestamp });

  try {
    await sendEarlyAccessNotification({ feature, email, timestamp });
  } catch (err) {
    console.error('[early-access:mail]', err.message);
    // Still record the signup locally; do not fail the user's request.
  }

  res.json({ ok: true, feature });
});

// Admin dashboard — captured early access signups
app.get('/admin', requireAuth, (req, res) => {
  res.render('layout', {
    page: 'admin',
    title: 'Admin — Transaction Command',
    earlyAccess: earlyAccessRequests.slice().reverse()
  });
});

// About (public)
app.get('/about', (req, res) => {
  res.render('layout', {
    page: 'about',
    title: 'About — Transaction Command'
  });
});

// Health
app.get('/_health', (_req, res) => res.json({ ok: true, version: APP_VERSION, deployed: LAST_DEPLOY }));

// 404
app.use((req, res) => {
  res.status(404).render('layout', {
    page: 'not-found',
    title: 'Not Found — Transaction Command'
  });
});

// Error
app.use((err, req, res, next) => {
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  res.status(500).send('Server error.');
});

// ─── SIMULATED REPORTS ────────────────────────────────────────────────────
function getSimulatedReport(docType) {
  switch (docType) {
    case 'Agreement of Sale (PA)':
      return {
        status: 'CONDITIONAL',
        docIdentified: 'PA Agreement of Sale (PAR Form ASR)',
        sections: [
          {
            heading: 'COMPLIANCE ISSUES FOUND',
            items: [
              'Page 1 — Seller signature date missing',
              'Page 3 — Earnest money deposit amount field blank',
              'Page 5 — Seller Property Disclosure checkbox not initialed',
              'Page 7 — Lead Paint Disclosure not attached (required for pre-1978)'
            ],
            tone: 'warn'
          },
          {
            heading: 'LEGAL FLAGS',
            items: [
              '⚠ Consumer Notice attached? NOT VERIFIED',
              '⚠ If buyer is LLC, operating agreement needed for signature authority'
            ],
            tone: 'warn'
          }
        ],
        brokerReview: {
          required: true,
          reason: 'Missing signatures and required disclosures prevent submission to escrow.'
        },
        nextSteps: [
          'Return to seller for completion of missing fields',
          'Verify property year built — attach Lead Paint Disclosure if pre-1978',
          'Confirm Consumer Notice signed at first substantive contact',
          'Resubmit for compliance check'
        ]
      };

    case 'Seller Property Disclosure (PA)':
      return {
        status: 'PASS',
        docIdentified: 'PA Seller Property Disclosure Statement (Form SPD)',
        sections: [
          {
            heading: 'COMPLIANCE CHECK',
            subheading: 'All required sections completed.',
            items: [
              '✓ All 17 property condition sections answered',
              '✓ Material defects disclosed in narrative',
              '✓ Seller signature and date present',
              '✓ Buyer acknowledgment section ready for signature'
            ],
            tone: 'ok'
          },
          { heading: 'LEGAL FLAGS', items: ['None'], tone: 'ok' }
        ],
        brokerReview: { required: false },
        nextSteps: [
          'Deliver to buyer prior to signing agreement',
          'Retain signed copy in transaction file'
        ]
      };

    case 'Ohio Wholesale Contract':
      return {
        status: 'FAIL',
        docIdentified: 'Ohio Purchase & Sale with Assignment Language',
        sections: [
          {
            heading: 'CRITICAL COMPLIANCE FAILURES',
            items: [
              '✗ ORC 5301.95 wholesale disclosure NOT PRESENT',
              '✗ Assignor not identified as "equitable interest holder"',
              '✗ Assignee disclosure language missing',
              '✗ Marketing window disclosure missing (required since 2023)'
            ],
            tone: 'fail'
          },
          {
            heading: 'LEGAL FLAGS',
            items: [
              '⚠ CRITICAL — Contract as written violates Ohio ORC 5301.95',
              '⚠ CRITICAL — Broker/licensee cannot market this equitable interest without disclosure',
              '⚠ Potential unlicensed practice of real estate exposure'
            ],
            tone: 'fail'
          }
        ],
        brokerReview: {
          required: true,
          urgent: true,
          reason: 'Do not proceed with marketing or assignment until remediated.'
        },
        nextSteps: [
          'Do NOT market or advertise equitable interest',
          'Use PwP Ohio Wholesale Addendum template',
          'Rewrite contract with ORC 5301.95 compliant language',
          'Broker review required before any further action'
        ]
      };

    // Supplemental doc types — generic passing reports so every option works in the demo.
    case 'Listing Agreement (PA)':
      return {
        status: 'PASS',
        docIdentified: 'PA Listing Agreement (PAR Form LB)',
        sections: [
          {
            heading: 'COMPLIANCE CHECK',
            subheading: 'Required elements verified.',
            items: [
              '✓ Listing period and commission terms present',
              '✓ Seller signature and date present',
              '✓ Dual agency disclosure acknowledged',
              '✓ Marketing authorization clear'
            ],
            tone: 'ok'
          },
          { heading: 'LEGAL FLAGS', items: ['None'], tone: 'ok' }
        ],
        brokerReview: { required: false },
        nextSteps: ['Submit to MLS', 'Retain signed copy in transaction file']
      };

    case 'Buyer Rep Agreement (PA)':
      return {
        status: 'PASS',
        docIdentified: 'PA Buyer Agency Contract (PAR Form BAC)',
        sections: [
          {
            heading: 'COMPLIANCE CHECK',
            subheading: 'Required elements verified.',
            items: [
              '✓ Term of representation defined',
              '✓ Buyer signature and date present',
              '✓ Compensation terms disclosed',
              '✓ Consumer Notice referenced'
            ],
            tone: 'ok'
          },
          { heading: 'LEGAL FLAGS', items: ['None'], tone: 'ok' }
        ],
        brokerReview: { required: false },
        nextSteps: ['Log in transaction file', 'Begin buyer showings']
      };

    case 'Lead Paint Disclosure':
      return {
        status: 'PASS',
        docIdentified: 'EPA Lead-Based Paint Hazards Disclosure',
        sections: [
          {
            heading: 'COMPLIANCE CHECK',
            items: [
              '✓ Seller disclosure section complete',
              '✓ Buyer acknowledgment section complete',
              '✓ Agent certification signed',
              '✓ EPA pamphlet acknowledged'
            ],
            tone: 'ok'
          },
          { heading: 'LEGAL FLAGS', items: ['None'], tone: 'ok' }
        ],
        brokerReview: { required: false },
        nextSteps: ['Attach to Agreement of Sale', 'Retain signed copy']
      };

    case 'Ohio Agency Disclosure':
      return {
        status: 'PASS',
        docIdentified: 'Ohio Agency Disclosure Statement',
        sections: [
          {
            heading: 'COMPLIANCE CHECK',
            items: [
              '✓ Brokerage relationship clearly identified',
              '✓ Signatures and date present',
              '✓ Consumer guide reference included'
            ],
            tone: 'ok'
          },
          { heading: 'LEGAL FLAGS', items: ['None'], tone: 'ok' }
        ],
        brokerReview: { required: false },
        nextSteps: ['Retain signed copy in transaction file']
      };

    default:
      return {
        status: 'CONDITIONAL',
        docIdentified: 'Unknown document type',
        sections: [
          {
            heading: 'ANALYSIS',
            items: ['Document type was not specified. Please select a document type and try again.'],
            tone: 'warn'
          }
        ],
        brokerReview: { required: true, reason: 'Cannot complete compliance check without document type.' },
        nextSteps: ['Select the correct document type and rerun the check.']
      };
  }
}

// ─── START ────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('');
    console.log(`  Transaction Command ${APP_VERSION}`);
    console.log(`  Last deploy: ${LAST_DEPLOY}`);
    console.log(`  Running on http://localhost:${PORT}`);
    console.log(`  Login:  tccommand / [ADMIN_PASSWORD]`);
    console.log('');
  });
}

module.exports = app;
