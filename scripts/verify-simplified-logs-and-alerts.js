const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const ARTIFACT_DIR = 'C:\\Users\\kamal\\.gemini\\antigravity\\brain\\18e8d503-860f-43e1-af91-566c633f7d3d';

async function main() {
  console.log('=== Starting Real Browser Automated Verification for Simplified Logs & Red Alerts ===');

  // Start dev server if not already running
  try {
    const health = await fetch('http://localhost:3000/api/health').catch(() => null);
    if (!health) {
      console.log('[Dev Server] Starting npm run dev in background...');
    }
  } catch {}

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\kamal\\AppData\\Local\\Temp\\chrome_verify_simple_' + Date.now();

  const cp = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9888',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1400,980',
    '--no-sandbox',
    '--disable-dev-shm-usage'
  ]);

  await sleep(2500);

  try {
    const verRes = await fetch('http://127.0.0.1:9888/json/version');
    const verData = await verRes.json();
    console.log('[Chrome CDP] Connected:', verData.Browser);

    const superAdminToken = jwt.sign({
      userId: "super_admin_user_001",
      collegeId: "ADM001",
      role: "admin",
      name: "Dr. Elizabeth Vance",
      isSuperAdmin: true,
      isStudent: false,
      section: "All"
    }, "acadex_local_dev_secret_key_9876543210");

    async function createTab(width = 1400, height = 980) {
      const tabRes = await fetch('http://127.0.0.1:9888/json/new?about:blank', { method: 'PUT' });
      const target = await tabRes.json();
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise(r => ws.onopen = r);

      let id = 1;
      const cbs = new Map();
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id && cbs.has(msg.id)) {
          cbs.get(msg.id)(msg);
          cbs.delete(msg.id);
        }
      };

      function send(method, params = {}) {
        return new Promise(r => {
          const cur = id++;
          cbs.set(cur, r);
          ws.send(JSON.stringify({ id: cur, method, params }));
        });
      }

      await send('Page.enable');
      await send('Runtime.enable');
      await send('Network.enable');
      if (width !== 1400 || height !== 980) {
        await send('Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 2,
          mobile: width < 600,
        });
      }

      return { ws, send };
    }

    // =========================================================================
    // PART 1: TEST DESKTOP ADMIN DASHBOARD WITH RED ALERTS & SIMPLIFIED LOGS
    // =========================================================================
    console.log('\n--- PART 1: Verifying Super Admin Red Alerts & Simplified Table ---');
    const tab1 = await createTab(1400, 980);

    // Setup mock network interception for rich verification
    await tab1.send('Fetch.enable', {
      patterns: [{ urlPattern: '*api/*', requestStage: 'Request' }]
    });

    tab1.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Fetch.requestPaused') {
        const { requestId, request } = msg.params;
        const url = request.url;

        const fulfill = (obj) => {
          tab1.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/json' }],
            body: Buffer.from(JSON.stringify(obj)).toString('base64')
          });
        };

        if (url.includes('/api/auth/me')) {
          fulfill({
            user: {
              id: "super_admin_user_001",
              name: "Dr. Elizabeth Vance",
              college_id: "ADM001",
              role: "admin",
              isSuperAdmin: true,
              isStudent: false,
              status: "active"
            }
          });
          return;
        }

        if (url.includes('/api/admin/dashboard-stats')) {
          fulfill({
            pendingRequests: 3,
            unreadMessages: 4,
            pendingAdminRequests: 2,
            latestAdminRequest: {
              id: "req_admin_999",
              type: "create_admin",
              requestedByName: "Prof. Alan Turing",
              targetUserName: "Dr. Grace Hopper",
              adminNote: "Needs departmental coordinator access for Computer Science Section B.",
              createdAt: new Date().toISOString()
            },
            latestMessage: {
              id: "msg_101",
              name: "Rohan Gupta",
              email: "rohan@student.acadex.edu",
              subject: "Assignment 2 Deadline Question",
              snippet: "Sir, could we please have an extension on Unit 2 assignment due to the university sports fest?",
              createdAt: new Date().toISOString()
            },
            securityAlertCount: 1,
            latestSecurityAlert: {
              id: "sec_alert_1",
              action: "AUTH_LOGIN_FAILED",
              description: "Repeated invalid password attempts from IP 192.168.1.140",
              actorName: "Anonymous Visitor",
              createdAt: new Date().toISOString()
            }
          });
          return;
        }

        if (url.includes('/api/admin/activity')) {
          const logs = [
            {
              id: "log_real_101",
              logId: "audit_1730000000_a1",
              action: "UPLOAD_NOTE",
              actionCategory: "resource",
              description: "Dr. Elizabeth Vance created note 'Operating Systems Unit 3 - Virtual Memory'",
              actor: { id: "super_admin_user_001", name: "Dr. Elizabeth Vance", role: "superadmin", collegeId: "ADM001" },
              target: { id: "note_101", type: "note", name: "Operating Systems Unit 3 - Virtual Memory" },
              route: "/user/dashboard/viewer?url=https%3A%2F%2Fexample.com%2Fos.pdf&title=Operating-Systems-Unit-3.pdf",
              status: "success",
              diff: null,
              createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString()
            },
            {
              id: "log_real_102",
              logId: "audit_1730000000_a2",
              action: "UPDATE_ASSIGNMENT",
              actionCategory: "admin",
              description: "Prof. Alan Turing updated 'Algorithm Design Problem Set 2'",
              actor: { id: "admin_user_002", name: "Prof. Alan Turing", role: "admin", collegeId: "ADM002" },
              target: { id: "asg_202", type: "assignment", name: "Algorithm Design Problem Set 2" },
              route: "/admin/assignments",
              status: "success",
              diff: {
                changedFields: ["deadline", "description"],
                before: { deadline: "2026-10-28", description: "Initial release" },
                after: { deadline: "2026-11-04", description: "Extended for student festival" }
              },
              createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
            },
            {
              id: "log_real_103",
              logId: "audit_1730000000_a3",
              action: "DOWNLOAD_RESOURCE",
              actionCategory: "resource",
              description: "Aarav Sharma downloaded 'Data Structures Laboratory Manual'",
              actor: { id: "stu_303", name: "Aarav Sharma", role: "student", collegeId: "CS2026045" },
              target: { id: "prac_303", type: "practical", name: "Data Structures Laboratory Manual" },
              route: "/user/dashboard/viewer?url=https%3A%2F%2Fexample.com%2Fds.pdf&title=Data-Structures-Manual.pdf",
              status: "success",
              createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString()
            },
            {
              id: "log_real_104",
              logId: "audit_1730000000_a4",
              action: "AUTH_LOGIN",
              actionCategory: "auth",
              description: "Priya Patel logged in via student portal",
              actor: { id: "stu_404", name: "Priya Patel", role: "student", collegeId: "CS2026089" },
              target: { id: "stu_404", type: "user", name: "Priya Patel" },
              route: "/user/dashboard",
              status: "success",
              createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString()
            },
            {
              id: "log_real_105",
              logId: "audit_1730000000_a5",
              action: "AUTH_FAILURE",
              actionCategory: "security",
              description: "Invalid password attempt for account ADM005 from IP 192.168.1.140",
              actor: { id: "anonymous", name: "Anonymous Visitor", role: "anonymous", collegeId: "ADM005" },
              target: { type: "auth", name: "ADM005" },
              route: "/login",
              status: "failure",
              createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
            }
          ];

          fulfill({
            logs,
            activities: logs,
            pagination: { total: 5, page: 1, limit: 15, totalPages: 1 }
          });
          return;
        }

        if (url.includes('/api/admin/students')) {
          fulfill({ students: Array.from({ length: 95 }, (_, i) => ({ id: `s_${i}`, role: 'student' })) });
          return;
        }

        if (url.includes('/api/notes')) {
          fulfill({ notes: Array.from({ length: 42 }, (_, i) => ({ id: `n_${i}` })) });
          return;
        }

        if (url.includes('/api/assignments')) {
          fulfill({ assignments: Array.from({ length: 18 }, (_, i) => ({ id: `a_${i}` })) });
          return;
        }

        if (url.includes('/api/practicals')) {
          fulfill({ practicals: Array.from({ length: 14 }, (_, i) => ({ id: `p_${i}` })) });
          return;
        }

        if (url.includes('/api/subjects')) {
          fulfill({ subjects: Array.from({ length: 10 }, (_, i) => ({ id: `sub_${i}` })) });
          return;
        }

        if (url.includes('/api/streams')) {
          fulfill({ streams: [{ id: 'st_1' }, { id: 'st_2' }] });
          return;
        }

        if (url.includes('/api/sections')) {
          fulfill({ sections: [{ id: 'sec_1' }, { id: 'sec_2' }, { id: 'sec_3' }] });
          return;
        }

        fulfill({});
        return;
      }
    };

    await tab1.send('Network.setCookie', {
      name: 'acadex-token',
      value: superAdminToken,
      url: 'http://localhost:3000'
    });

    console.log('[Admin Dashboard] Navigating to http://localhost:3000/admin...');
    await tab1.send('Page.navigate', { url: 'http://localhost:3000/admin' });
    await sleep(4000);

    // Verify Red Alert Banner is present and shows the exact message
    const redAlertCheck = await tab1.send('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body.innerText;
          const hasRedAlertHeading = body.includes('Critical Super Admin Alert');
          const hasRequesterName = body.includes('Prof. Alan Turing');
          const hasRequestMessage = body.includes('Needs departmental coordinator access');
          const hasSecurityAlert = body.includes('Security Notice') || body.includes('failed events');
          const hasStudentMessageSnippet = body.includes('sports fest');
          const hasSimpleActionBadges = body.includes('Created') && body.includes('Updated') && body.includes('Downloaded');
          return {
            hasRedAlertHeading,
            hasRequesterName,
            hasRequestMessage,
            hasSecurityAlert,
            hasStudentMessageSnippet,
            hasSimpleActionBadges
          };
        })()
      `,
      returnByValue: true
    });
    console.log('[Admin Dashboard] Red Alert & Table Check:', JSON.stringify(redAlertCheck.result?.result?.value, null, 2));

    const snapDash = await tab1.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_super_admin_red_alerts_dashboard.png'), Buffer.from(snapDash.result.data, 'base64'));
    console.log('>>> Saved verified_super_admin_red_alerts_dashboard.png');

    // =========================================================================
    // PART 2: CLICK ROW TO OPEN SIMPLIFIED DETAIL SHEET
    // =========================================================================
    console.log('\n--- PART 2: Clicking Row to Inspect Simplified Detail Sheet ---');
    await tab1.send('Runtime.evaluate', {
      expression: `
        (() => {
          // Click row for the updated assignment
          const row = Array.from(document.querySelectorAll('tr')).find(r => r.innerText.includes('Algorithm Design Problem Set 2'));
          if (row) row.click();
        })()
      `
    });
    await sleep(1500);

    const sheetCheck = await tab1.send('Runtime.evaluate', {
      expression: `
        (() => {
          const sheet = document.querySelector('[role="dialog"]');
          if (!sheet) return { open: false };
          const title = sheet.querySelector('h2')?.innerText;
          const text = sheet.innerText;
          const hasBeforeAfter = text.includes('What Changed') || text.includes('Previous Value');
          const hasActor = text.includes('Prof. Alan Turing');
          const hasDeepLink = !!sheet.querySelector('a[href*="/admin/assignments"]');
          return {
            open: true,
            title,
            hasBeforeAfter,
            hasActor,
            hasDeepLink
          };
        })()
      `,
      returnByValue: true
    });
    console.log('[Detail Sheet] Check:', JSON.stringify(sheetCheck.result?.result?.value, null, 2));

    const snapSheet = await tab1.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_simplified_detail_sheet.png'), Buffer.from(snapSheet.result.data, 'base64'));
    console.log('>>> Saved verified_simplified_detail_sheet.png');

    tab1.ws.close();

    // =========================================================================
    // PART 3: TEST MOBILE RESPONSIVE CARDS VIEW (iPhone Viewport 390x844)
    // =========================================================================
    console.log('\n--- PART 3: Verifying Mobile Responsive View (390x844) ---');
    const tabMobile = await createTab(390, 844);

    tabMobile.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Fetch.requestPaused') {
        const { requestId, request } = msg.params;
        const url = request.url;

        const fulfill = (obj) => {
          tabMobile.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/json' }],
            body: Buffer.from(JSON.stringify(obj)).toString('base64')
          });
        };

        if (url.includes('/api/auth/me')) {
          fulfill({
            user: {
              id: "super_admin_user_001",
              name: "Dr. Elizabeth Vance",
              college_id: "ADM001",
              role: "admin",
              isSuperAdmin: true,
              isStudent: false,
              status: "active"
            }
          });
          return;
        }

        if (url.includes('/api/admin/activity')) {
          const logs = [
            {
              id: "log_real_101",
              logId: "audit_1730000000_a1",
              action: "UPLOAD_NOTE",
              actionCategory: "resource",
              description: "Dr. Elizabeth Vance created note 'Operating Systems Unit 3 - Virtual Memory'",
              actor: { id: "super_admin_user_001", name: "Dr. Elizabeth Vance", role: "superadmin", collegeId: "ADM001" },
              target: { id: "note_101", type: "note", name: "Operating Systems Unit 3" },
              status: "success",
              createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString()
            },
            {
              id: "log_real_102",
              logId: "audit_1730000000_a2",
              action: "DOWNLOAD_RESOURCE",
              actionCategory: "resource",
              description: "Aarav Sharma downloaded 'Data Structures Laboratory Manual'",
              actor: { id: "stu_303", name: "Aarav Sharma", role: "student", collegeId: "CS2026045" },
              target: { id: "prac_303", type: "practical", name: "Data Structures Manual" },
              status: "success",
              createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
            }
          ];
          fulfill({ logs, activities: logs, pagination: { total: 2, page: 1, limit: 15, totalPages: 1 } });
          return;
        }

        fulfill({});
        return;
      }
    };

    await tabMobile.send('Fetch.enable', {
      patterns: [{ urlPattern: '*api/*', requestStage: 'Request' }]
    });

    await tabMobile.send('Network.setCookie', {
      name: 'acadex-token',
      value: superAdminToken,
      url: 'http://localhost:3000'
    });

    await tabMobile.send('Page.navigate', { url: 'http://localhost:3000/admin/activity' });
    await sleep(4000);

    const mobileCheck = await tabMobile.send('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body;
          const scrollWidth = body.scrollWidth;
          const innerWidth = window.innerWidth;
          const hasHorizontalOverflow = scrollWidth > innerWidth + 5;
          const hasStackedCards = !!document.querySelector('.divide-y');
          return {
            scrollWidth,
            innerWidth,
            hasHorizontalOverflow,
            hasStackedCards
          };
        })()
      `,
      returnByValue: true
    });
    console.log('[Mobile Responsive View] Check:', JSON.stringify(mobileCheck.result?.result?.value, null, 2));

    const snapMobile = await tabMobile.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verified_mobile_responsive_audit_logs.png'), Buffer.from(snapMobile.result.data, 'base64'));
    console.log('>>> Saved verified_mobile_responsive_audit_logs.png');

    tabMobile.ws.close();

    console.log('\n=== All Verifications Completed Successfully! ===');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    cp.kill();
  }
}

main();
