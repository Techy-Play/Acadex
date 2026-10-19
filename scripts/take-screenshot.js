const { spawn } = require('child_process');
const fs = require('fs');

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cp = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\kamal\\AppData\\Local\\Temp\\chrome_snap_profile',
    '--window-size=1280,800'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const verRes = await fetch('http://127.0.0.1:9222/json/version');
    const verData = await verRes.json();
    console.log('Connected to Chrome:', verData.Browser);

    const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000/dev/test/pdf', { method: 'PUT' });
    const target = await newTabRes.json();
    console.log('Opened target:', target.url);

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
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

    console.log('Navigating and waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));

    const snap = await send('Page.captureScreenshot', { format: 'png' });
    if (snap.result && snap.result.data) {
      fs.writeFileSync('C:\\Users\\kamal\\.gemini\\antigravity\\brain\\18e8d503-860f-43e1-af91-566c633f7d3d\\test_page_screenshot.png', Buffer.from(snap.result.data, 'base64'));
      console.log('Saved test_page_screenshot.png');
    }
    ws.close();
  } catch (e) {
    console.error('Error during snapshot:', e);
  } finally {
    cp.kill();
  }
}

run();
