const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runBrowserVerification() {
  console.log('=== Starting Real Browser Automated Verification ===');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\kamal\\AppData\\Local\\Temp\\chrome_verify_profile_' + Date.now();
  
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

    const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000/dev/test/pdf', { method: 'PUT' });
    const target = await newTabRes.json();
    console.log('[Browser] Target page opened:', target.url);

    ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();
    const consoleLogs = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
        consoleLogs.push({ type: msg.params.type, text });
      }
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const curId = id++;
        callbacks.set(curId, resolve);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await new Promise((resolve) => ws.onopen = resolve);
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    console.log('[Step 1] Loading /dev/test/pdf and setting test client ID in sessionStorage...');
    await sleep(2500);

    // Set mock client ID in sessionStorage so viewer attempts initialization
    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('acadex_test_adobe_client_id', 'fe8e73aff7644345838859be2c119dd9');
        localStorage.removeItem('acadex-pdf-reader-theme'); // ensure fresh default
      `
    });

    // Verify initial file upload dropzone is visible
    const dropzoneCheck = await send('Runtime.evaluate', {
      expression: `!!document.querySelector('input[type="file"]')`,
      returnByValue: true
    });
    const hasInput = dropzoneCheck.result?.result?.value;
    console.log('[Step 2] Dropzone file input present:', hasInput);
    if (!hasInput) throw new Error('File input not found on /dev/test/pdf');

    // Upload file 1 via DOM input
    console.log('[Step 3] Uploading scripts/test-sample-1.pdf...');
    const pdf1Bytes = fs.readFileSync(path.resolve('scripts/test-sample-1.pdf'));
    const base64Pdf1 = pdf1Bytes.toString('base64');

    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const byteCharacters = atob("${base64Pdf1}");
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const file = new File([byteArray], "sample-one.pdf", { type: "application/pdf" });
          const input = document.querySelector('input[type="file"]');
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `
    });
    await sleep(1000);

    // Click "Open in Adobe Reader" button
    console.log('[Step 4] Clicking Open in Adobe Reader...');
    const clickOpen = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const openBtn = btns.find(b => b.textContent && b.textContent.includes('Open in Adobe Reader'));
          if (openBtn) {
            openBtn.click();
            return true;
          }
          return false;
        })()
      `,
      returnByValue: true
    });
    console.log('[Step 4 Result] Open button clicked:', clickOpen.result?.result?.value);
    await sleep(2000);

    // Verify Top Theme Control Pill exists on top of PDF - strictly 2 options (Light default and Dark)
    console.log('[Step 5] Checking theme control pill on top of PDF (strictly 2 options)...');
    let pillRetries = 10;
    let pillData = null;
    while (pillRetries-- > 0) {
      await sleep(1000);
      const pillCheck = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const pill = document.querySelector('[role="group"][aria-label="PDF Theme Mode"]');
            if (!pill) return { found: false };
            const rect = pill.getBoundingClientRect();
            const buttons = Array.from(pill.querySelectorAll('button')).map(b => b.textContent.trim());
            const activeBtn = pill.querySelector('button.font-semibold')?.textContent?.trim();
            return {
              found: true,
              top: rect.top,
              right: window.innerWidth - rect.right,
              buttons,
              activeBtn
            };
          })()
        `,
        returnByValue: true
      });
      pillData = pillCheck.result?.result?.value;
      if (pillData && pillData.found) break;
    }
    console.log('[Step 5 Verification]', JSON.stringify(pillData, null, 2));

    if (!pillData || !pillData.found) {
      console.log('Console logs during run:', JSON.stringify(consoleLogs, null, 2));
      const bodyText = await send('Runtime.evaluate', { expression: 'document.body.innerText' });
      console.log('DOM body text:', bodyText.result?.value);
      const snapErr = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\Users\\kamal\\.gemini\\antigravity\\brain\\18e8d503-860f-43e1-af91-566c633f7d3d\\step5_err.png', Buffer.from(snapErr.result.data, 'base64'));
      throw new Error('Theme control pill was not found on top of PDF!');
    }
    if (pillData.buttons.length !== 2) {
      throw new Error(`Expected strictly 2 options, got ${pillData.buttons.length}: ${JSON.stringify(pillData.buttons)}`);
    }
    if (!pillData.activeBtn.includes('Default') && !pillData.activeBtn.includes('Light')) {
      throw new Error(`Expected Light (Default) to be selected by default, got: ${pillData.activeBtn}`);
    }
    console.log('>>> Verified: Strictly 2 options present, Light is selected by default!');

    // Capture screenshot in Default (Light) Mode
    const snapLight = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\kamal\\.gemini\\antigravity\\brain\\18e8d503-860f-43e1-af91-566c633f7d3d\\verified_default_light.png', Buffer.from(snapLight.result.data, 'base64'));
    console.log('>>> Saved verified_default_light.png');

    // Test Clicking "Dark"
    console.log('[Step 6] Testing switch to Dark Theme...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const pill = document.querySelector('[role="group"][aria-label="PDF Theme Mode"]');
          const darkBtn = Array.from(pill.querySelectorAll('button')).find(b => b.textContent.includes('Dark'));
          if (darkBtn) darkBtn.click();
        })()
      `
    });
    await sleep(600);

    const darkCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const pill = document.querySelector('[role="group"][aria-label="PDF Theme Mode"]');
          const activeBtn = pill.querySelector('button.font-semibold')?.textContent?.trim();
          const container = document.querySelector('div[id^="adobe-pdf-"]');
          const computedBg = container ? window.getComputedStyle(container).backgroundColor : null;
          const localStorageVal = localStorage.getItem('acadex-pdf-reader-theme');
          return { activeBtn, computedBg, localStorageVal };
        })()
      `,
      returnByValue: true
    });
    const darkData = darkCheck.result?.result?.value;
    console.log('[Step 6 Verification (Dark)]', JSON.stringify(darkData, null, 2));
    if (!darkData || !darkData.activeBtn.includes('Dark') || darkData.localStorageVal !== 'dark') {
      throw new Error('Dark theme was not correctly activated or saved to localStorage!');
    }
    console.log('>>> Verified: Dark theme activated successfully (localStorage="dark")!');

    // Capture screenshot in Dark Mode
    const snapDark = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\kamal\\.gemini\\antigravity\\brain\\18e8d503-860f-43e1-af91-566c633f7d3d\\verified_dark_theme.png', Buffer.from(snapDark.result.data, 'base64'));
    console.log('>>> Saved verified_dark_theme.png');

    // Switch back to Light (Default)
    console.log('[Step 7] Switching back to Light (Default)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const pill = document.querySelector('[role="group"][aria-label="PDF Theme Mode"]');
          const lightBtn = Array.from(pill.querySelectorAll('button')).find(b => b.textContent.includes('Light') || b.textContent.includes('Default'));
          if (lightBtn) lightBtn.click();
        })()
      `
    });
    await sleep(500);

    // Test Step 9: Sequential PDF upload (Change PDF and load file 2)
    console.log('[Step 9] Testing sequential PDF loading with sample 2...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const changeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Change PDF'));
          if (changeBtn) changeBtn.click();
        })()
      `
    });
    await sleep(1000);

    const pdf2Bytes = fs.readFileSync(path.resolve('scripts/test-sample-2.pdf'));
    const base64Pdf2 = pdf2Bytes.toString('base64');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const byteCharacters = atob("${base64Pdf2}");
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const file = new File([byteArray], "sample-two.pdf", { type: "application/pdf" });
          const input = document.querySelector('input[type="file"]');
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `
    });
    await sleep(1000);

    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const openBtn = btns.find(b => b.textContent && b.textContent.includes('Open in Adobe Reader'));
          if (openBtn) openBtn.click();
        })()
      `
    });
    await sleep(2000);

    const file2Check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const pill = document.querySelector('[role="group"][aria-label="PDF Theme Mode"]');
          const headerTitle = document.querySelector('header h1')?.textContent?.trim();
          return {
            pillPresent: !!pill,
            headerTitle
          };
        })()
      `,
      returnByValue: true
    });
    const file2Data = file2Check.result?.result?.value;
    console.log('[Step 9 Result]', JSON.stringify(file2Data, null, 2));
    if (!file2Data || !file2Data.pillPresent || file2Data.headerTitle !== 'sample-two.pdf') {
      throw new Error('Sequential PDF load failed or title mismatch!');
    }
    console.log('>>> Verified: Second PDF loaded and theme controls present!');

    // Test Step 10: Global Acadex Viewer route (/user/dashboard/viewer)
    console.log('[Step 10] Testing global /user/dashboard/viewer route with auth session...');
    const jwt = require('jsonwebtoken');
    const authToken = jwt.sign({
      userId: "user_test_verify",
      collegeId: "C999",
      role: "student",
      name: "Verification Student",
      section: "A",
      isStudent: true
    }, "acadex_local_dev_secret_key_9876543210");

    const viewerTabRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
    const viewerTarget = await viewerTabRes.json();
    const wsViewer = new WebSocket(viewerTarget.webSocketDebuggerUrl);

    await new Promise((resolve) => wsViewer.onopen = resolve);
    let vId = 1;
    const vCallbacks = new Map();
    wsViewer.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && vCallbacks.has(msg.id)) {
        vCallbacks.get(msg.id)(msg);
        vCallbacks.delete(msg.id);
      }
    };
    function sendViewer(method, params = {}) {
      return new Promise((resolve) => {
        const curId = vId++;
        vCallbacks.set(curId, resolve);
        wsViewer.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await sendViewer('Page.enable');
    await sendViewer('Runtime.enable');
    await sendViewer('Network.enable');
    await sendViewer('Fetch.enable', {
      patterns: [
        { urlPattern: '*api/auth/me*', requestStage: 'Request' },
        { urlPattern: '*api/notifications*', requestStage: 'Request' },
        { urlPattern: '*api/pdf-proxy*', requestStage: 'Request' }
      ]
    });

    wsViewer.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Fetch.requestPaused') {
        const { requestId, request } = msg.params;
        if (request.url.includes('/api/auth/me')) {
          const body = JSON.stringify({
            user: {
              id: "user_test_verify",
              name: "Verification Student",
              college_id: "C999",
              role: "student",
              isStudent: true,
              must_change_password: false,
              theme: "dark"
            }
          });
          const base64Body = Buffer.from(body).toString('base64');
          sendViewer('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [
              { name: 'content-type', value: 'application/json' }
            ],
            body: base64Body
          });
          return;
        }
        if (request.url.includes('/api/pdf-proxy')) {
          sendViewer('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [
              { name: 'content-type', value: 'application/pdf' }
            ],
            body: base64Pdf1
          });
          return;
        }
        sendViewer('Fetch.continueRequest', { requestId });
        return;
      }
      if (msg.id && vCallbacks.has(msg.id)) {
        vCallbacks.get(msg.id)(msg);
        vCallbacks.delete(msg.id);
      }
    };

    // Set auth cookie
    await sendViewer('Network.setCookie', {
      name: 'acadex-token',
      value: authToken,
      domain: 'localhost',
      path: '/'
    });

    // Ensure session client ID is set in the new tab before page load
    await sendViewer('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        sessionStorage.setItem('acadex_test_adobe_client_id', 'fe8e73aff7644345838859be2c119dd9');
      `
    });

    // Navigate to viewer page
    await sendViewer('Page.navigate', {
      url: 'http://localhost:3000/user/dashboard/viewer?url=https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2F1A2B3C4D5E%2Fview&title=Lecture-01-Algorithms.pdf'
    });
    // Wait for route compilation and rendering
    let retries = 15;
    let globalData = null;
    while (retries-- > 0) {
      await sleep(1000);
      const res = await sendViewer('Runtime.evaluate', {
        expression: `
          (() => {
            const pill = document.querySelector('[role="group"][aria-label="PDF Theme Mode"]');
            const title = document.querySelector('header h1')?.textContent?.trim();
            const compiling = document.body.textContent.includes('Compiling');
            return {
              pillPresent: !!pill,
              title,
              compiling,
              buttons: pill ? Array.from(pill.querySelectorAll('button')).map(b => b.textContent.trim()) : []
            };
          })()
        `,
        returnByValue: true
      });
      globalData = res.result?.result?.value;
      if (globalData && globalData.pillPresent) {
        break;
      }
    }
    console.log('[Step 10 Result (Global Viewer)]', JSON.stringify(globalData, null, 2));

    const snapGlobal = await sendViewer('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\kamal\\.gemini\\antigravity\\brain\\18e8d503-860f-43e1-af91-566c633f7d3d\\verified_global_viewer.png', Buffer.from(snapGlobal.result.data, 'base64'));
    console.log('>>> Saved verified_global_viewer.png');

    if (!globalData || !globalData.pillPresent) {
      throw new Error('Theme control pill was not found on top of PDF in /user/dashboard/viewer!');
    }
    if (globalData.buttons.length !== 2) {
      throw new Error(`Expected strictly 2 options in global viewer, got: ${JSON.stringify(globalData.buttons)}`);
    }
    console.log('>>> Verified: Theme control pill with strictly 2 options (Light and Dark) is active on top of PDF in global /user/dashboard/viewer!');

    wsViewer.close();
    ws.close();

    console.log('\n=== ALL BROWSER VERIFICATIONS PASSED WITH 0 ERRORS! ===');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exitCode = 1;
  } finally {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    cp.kill();
  }
}

runBrowserVerification();
