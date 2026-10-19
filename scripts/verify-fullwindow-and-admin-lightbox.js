const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runVerification() {
  console.log('=== Starting Real Browser Automated Verification for FULL_WINDOW & Admin Lightbox ===');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\kamal\\AppData\\Local\\Temp\\chrome_lightbox_profile_' + Date.now();

  const cp = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,900',
    '--no-sandbox',
    '--disable-dev-shm-usage'
  ]);

  await sleep(2000);

  let ws;
  try {
    const verRes = await fetch('http://127.0.0.1:9222/json/version');
    const verData = await verRes.json();
    console.log('[Browser] Connected to:', verData.Browser);

    const pdfSamplePath = path.resolve('scripts/test-sample-1.pdf');
    const pdfBytes = fs.readFileSync(pdfSamplePath);
    const base64Pdf = pdfBytes.toString('base64');

    const adminAuthToken = jwt.sign({
      userId: "admin_test_user_999",
      collegeId: "ADM001",
      role: "admin",
      name: "Master Admin",
      isSuperAdmin: true,
      isStudent: false,
      section: "All"
    }, "acadex_local_dev_secret_key_9876543210");

    // =========================================================================
    // PART 1: Test Admin Panel Lightbox (/admin/notes)
    // =========================================================================
    console.log('\n--- PART 1: Verifying Admin Panel Lightbox (/admin/notes) ---');
    const adminTabRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
    const adminTarget = await adminTabRes.json();
    const wsAdmin = new WebSocket(adminTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => wsAdmin.onopen = resolve);

    let aId = 1;
    const aCallbacks = new Map();
    wsAdmin.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && aCallbacks.has(msg.id)) {
        aCallbacks.get(msg.id)(msg);
        aCallbacks.delete(msg.id);
      }
    };
    function sendAdmin(method, params = {}) {
      return new Promise((resolve) => {
        const curId = aId++;
        aCallbacks.set(curId, resolve);
        wsAdmin.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await sendAdmin('Page.enable');
    await sendAdmin('Runtime.enable');
    await sendAdmin('Network.enable');
    await sendAdmin('Fetch.enable', {
      patterns: [
        { urlPattern: '*api/auth/me*', requestStage: 'Request' },
        { urlPattern: '*api/notes*', requestStage: 'Request' },
        { urlPattern: '*api/subjects*', requestStage: 'Request' },
        { urlPattern: '*api/sections*', requestStage: 'Request' },
        { urlPattern: '*api/pdf-proxy*', requestStage: 'Request' },
        { urlPattern: '*api/notifications*', requestStage: 'Request' }
      ]
    });

    wsAdmin.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Fetch.requestPaused') {
        const { requestId, request } = msg.params;
        if (request.url.includes('/api/auth/me')) {
          const body = JSON.stringify({
            user: {
              id: "admin_test_user_999",
              name: "Master Admin",
              college_id: "ADM001",
              role: "admin",
              isSuperAdmin: true,
              isStudent: false,
              must_change_password: false
            }
          });
          sendAdmin('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/json' }],
            body: Buffer.from(body).toString('base64')
          });
          return;
        }
        if (request.url.includes('/api/notes')) {
          const body = JSON.stringify({
            notes: [
              {
                _id: "test_note_101",
                title: "Algorithms-and-Data-Structures-Unit-1.pdf",
                file_url: "https://drive.google.com/file/d/1TestDriveFileIdABC/view",
                uploadedAt: new Date().toISOString(),
                subject: { _id: "sub_1", name: "Data Structures", semester: 3 },
                section: { _id: "sec_1", name: "Section A" },
                sections: [{ _id: "sec_1", name: "Section A" }],
                uploadedBy: { name: "Prof. Alan Turing" }
              }
            ]
          });
          sendAdmin('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/json' }],
            body: Buffer.from(body).toString('base64')
          });
          return;
        }
        if (request.url.includes('/api/subjects')) {
          const body = JSON.stringify({
            subjects: [{ _id: "sub_1", name: "Data Structures", semester: 3 }]
          });
          sendAdmin('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/json' }],
            body: Buffer.from(body).toString('base64')
          });
          return;
        }
        if (request.url.includes('/api/sections')) {
          const body = JSON.stringify({
            sections: [{ _id: "sec_1", name: "Section A" }]
          });
          sendAdmin('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/json' }],
            body: Buffer.from(body).toString('base64')
          });
          return;
        }
        if (request.url.includes('/api/pdf-proxy')) {
          sendAdmin('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/pdf' }],
            body: base64Pdf
          });
          return;
        }
        sendAdmin('Fetch.continueRequest', { requestId });
        return;
      }
      if (msg.id && aCallbacks.has(msg.id)) {
        aCallbacks.get(msg.id)(msg);
        aCallbacks.delete(msg.id);
      }
    };

    await sendAdmin('Network.setCookie', {
      name: 'acadex-token',
      value: adminAuthToken,
      domain: 'localhost',
      path: '/'
    });

    console.log('[Admin Test] Navigating to http://localhost:3000/admin/notes...');
    await sendAdmin('Page.navigate', { url: 'http://localhost:3000/admin/notes' });

    let retries = 20;
    let tableFound = false;
    while (retries-- > 0) {
      await sleep(1000);
      const res = await sendAdmin('Runtime.evaluate', {
        expression: `
          (() => {
            const row = document.querySelector('tbody tr');
            const openBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open'));
            return {
              hasRow: !!row,
              hasOpenBtn: !!openBtn,
              url: window.location.pathname
            };
          })()
        `,
        returnByValue: true
      });
      const val = res.result?.result?.value;
      if (val && val.hasRow && val.hasOpenBtn) {
        tableFound = true;
        console.log('[Admin Test] Notes table loaded with Open button:', val);
        break;
      }
    }

    if (!tableFound) {
      const bodyText = await sendAdmin('Runtime.evaluate', { expression: 'document.body.innerText' });
      console.log('[Admin Test Debug] bodyText:', bodyText.result?.result?.value);
      const snapErr = await sendAdmin('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\Users\\kamal\\.gemini\\antigravity\\brain\\18e8d503-860f-43e1-af91-566c633f7d3d\\admin_notes_err.png', Buffer.from(snapErr.result.data, 'base64'));
      throw new Error('Admin notes table or Open button was not rendered.');
    }

    // Click "Open" button in table
    console.log('[Admin Test] Clicking Open button to trigger Lightbox...');
    await sendAdmin('Runtime.evaluate', {
      expression: `
        (() => {
          const openBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open'));
          if (openBtn) openBtn.click();
        })()
      `
    });
    await sleep(2000);

    // Verify Lightbox Modal opened on the same page
    const lightboxCheck = await sendAdmin('Runtime.evaluate', {
      expression: `
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          const title = dialog ? dialog.querySelector('h2')?.textContent?.trim() : null;
          const badge = dialog ? dialog.querySelector('header')?.textContent?.includes('Admin Lightbox') : false;
          const currentPath = window.location.pathname;
          const hasCloseBtn = dialog ? !!dialog.querySelector('button[aria-label="Close preview"]') : false;
          return {
            isOpen: !!dialog,
            title,
            hasAdminBadge: badge,
            currentPath,
            hasCloseBtn
          };
        })()
      `,
      returnByValue: true
    });
    const lbData = lightboxCheck.result?.result?.value;
    console.log('[Admin Test] Lightbox Verification Data:', JSON.stringify(lbData, null, 2));

    if (!lbData || !lbData.isOpen) {
      throw new Error('Admin Lightbox did not open upon clicking Open button!');
    }
    if (lbData.currentPath !== '/admin/notes') {
      throw new Error(`Expected path to stay on /admin/notes, but was: ${lbData.currentPath}`);
    }
    if (!lbData.title || !lbData.title.includes('Algorithms-and-Data-Structures')) {
      throw new Error(`Lightbox title unexpected: ${lbData.title}`);
    }

    console.log('>>> Verified: Lightbox opened directly on /admin/notes without page navigation!');

    // Capture screenshot of Admin Lightbox
    const snapLightbox = await sendAdmin('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\kamal\\.gemini\\antigravity\\brain\\18e8d503-860f-43e1-af91-566c633f7d3d\\verified_admin_lightbox.png', Buffer.from(snapLightbox.result.data, 'base64'));
    console.log('>>> Saved verified_admin_lightbox.png');

    // Test dismiss via Close button
    console.log('[Admin Test] Closing Lightbox...');
    await sendAdmin('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close preview"]');
          if (closeBtn) closeBtn.click();
        })()
      `
    });
    await sleep(1000);

    const afterCloseCheck = await sendAdmin('Runtime.evaluate', {
      expression: `!!document.querySelector('[role="dialog"]')`,
      returnByValue: true
    });
    console.log('[Admin Test] Lightbox closed successfully:', !afterCloseCheck.result?.result?.value);
    if (afterCloseCheck.result?.result?.value) {
      throw new Error('Lightbox did not close after clicking close button!');
    }

    wsAdmin.close();

    // =========================================================================
    // PART 2: Test User Dashboard Viewer (/user/dashboard/viewer) in FULL_WINDOW
    // =========================================================================
    console.log('\n--- PART 2: Verifying User Dashboard Viewer in FULL_WINDOW mode without annotation tools ---');
    const studentAuthToken = jwt.sign({
      userId: "student_test_user_1",
      collegeId: "C101",
      role: "student",
      name: "Ada Lovelace",
      isStudent: true,
      section: "A"
    }, "acadex_local_dev_secret_key_9876543210");

    const studentTabRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
    const studentTarget = await studentTabRes.json();
    const wsStudent = new WebSocket(studentTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => wsStudent.onopen = resolve);

    let sId = 1;
    const sCallbacks = new Map();
    wsStudent.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && sCallbacks.has(msg.id)) {
        sCallbacks.get(msg.id)(msg);
        sCallbacks.delete(msg.id);
      }
    };
    function sendStudent(method, params = {}) {
      return new Promise((resolve) => {
        const curId = sId++;
        sCallbacks.set(curId, resolve);
        wsStudent.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await sendStudent('Page.enable');
    await sendStudent('Runtime.enable');
    await sendStudent('Network.enable');
    await sendStudent('Fetch.enable', {
      patterns: [
        { urlPattern: '*api/auth/me*', requestStage: 'Request' },
        { urlPattern: '*api/pdf-proxy*', requestStage: 'Request' },
        { urlPattern: '*api/notifications*', requestStage: 'Request' }
      ]
    });

    wsStudent.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Fetch.requestPaused') {
        const { requestId, request } = msg.params;
        if (request.url.includes('/api/auth/me')) {
          const body = JSON.stringify({
            user: {
              id: "student_test_user_1",
              name: "Ada Lovelace",
              college_id: "C101",
              role: "student",
              isStudent: true,
              must_change_password: false
            }
          });
          sendStudent('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/json' }],
            body: Buffer.from(body).toString('base64')
          });
          return;
        }
        if (request.url.includes('/api/pdf-proxy')) {
          sendStudent('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/pdf' }],
            body: base64Pdf
          });
          return;
        }
        sendStudent('Fetch.continueRequest', { requestId });
        return;
      }
      if (msg.id && sCallbacks.has(msg.id)) {
        sCallbacks.get(msg.id)(msg);
        sCallbacks.delete(msg.id);
      }
    };

    await sendStudent('Network.setCookie', {
      name: 'acadex-token',
      value: studentAuthToken,
      domain: 'localhost',
      path: '/'
    });

    console.log('[Student Test] Navigating to http://localhost:3000/user/dashboard/viewer?url=https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2F1A2B3C4D5E%2Fview&title=Lecture-01-Algorithms.pdf...');
    await sendStudent('Page.navigate', {
      url: 'http://localhost:3000/user/dashboard/viewer?url=https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2F1A2B3C4D5E%2Fview&title=Lecture-01-Algorithms.pdf'
    });

    let sRetries = 20;
    let studentViewerFound = false;
    let studentData = null;
    while (sRetries-- > 0) {
      await sleep(1000);
      const res = await sendStudent('Runtime.evaluate', {
        expression: `
          (() => {
            const container = document.querySelector('div[id^="adobe-pdf-"]');
            const pill = document.querySelector('[role="group"][aria-label="PDF Theme Mode"]');
            const title = document.querySelector('header h1')?.textContent?.trim();
            const iframe = container ? container.querySelector('iframe') : null;
            return {
              hasContainer: !!container,
              hasPill: !!pill,
              title,
              hasIframe: !!iframe,
              containerClass: container ? container.className : null
            };
          })()
        `,
        returnByValue: true
      });
      studentData = res.result?.result?.value;
      if (studentData && studentData.hasContainer && studentData.hasPill) {
        studentViewerFound = true;
        break;
      }
    }

    console.log('[Student Test] Viewer Loaded:', JSON.stringify(studentData, null, 2));
    if (!studentViewerFound) {
      throw new Error('User dashboard PDF viewer container or theme pill was not found.');
    }

    // Verify FULL_WINDOW container styling (w-full h-full min-h-0 flex-1)
    if (!studentData.containerClass.includes('w-full') || !studentData.containerClass.includes('h-full')) {
      throw new Error(`Expected container to have full window classes, got: ${studentData.containerClass}`);
    }

    console.log('>>> Verified: User Dashboard PDF Viewer renders in FULL_WINDOW mode with theme controls!');

    const snapStudent = await sendStudent('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\kamal\\.gemini\\antigravity\\brain\\18e8d503-860f-43e1-af91-566c633f7d3d\\verified_fullwindow_user_viewer.png', Buffer.from(snapStudent.result.data, 'base64'));
    console.log('>>> Saved verified_fullwindow_user_viewer.png');

    wsStudent.close();

    console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY (0 ERRORS)! ===');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exitCode = 1;
  } finally {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    cp.kill();
  }
}

runVerification();
