import http from "node:http";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/oauth2callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("\n❌ ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required.");
  console.error("Run: $env:GOOGLE_CLIENT_ID='your_id'; $env:GOOGLE_CLIENT_SECRET='your_secret'; node scripts/get-refresh-token.mjs\n");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

console.log("\n==================================================================");
console.log("🔑 ACADEX GOOGLE DRIVE ONE-TIME OAUTH AUTHORIZATION");
console.log("==================================================================");
console.log("\n1. Copy and open this URL in your browser:\n");
console.log(authUrl);
console.log("\n2. Sign in with your 5 TB Google account and click Allow.");
console.log("==================================================================\n");

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/oauth2callback")) {
    res.writeHead(404);
    res.end();
    return;
  }
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400);
    res.end("Authorization code missing.");
    return;
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n==================================================================");
    console.log("🎉 SUCCESS! YOUR GOOGLE REFRESH TOKEN IS:\n");
    console.log(tokens.refresh_token);
    console.log("\nCopy the refresh token above and add it to your Vercel Environment Variables!");
    console.log("==================================================================\n");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <div style="font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #f8fafc;">
        <h1 style="color: #22c55e;">🎉 Acadex Google Drive Authorization Successful!</h1>
        <p style="font-size: 18px; color: #94a3b8;">You can close this browser tab and return to your terminal to copy your REFRESH TOKEN.</p>
      </div>
    `);
    server.close();
  } catch (error) {
    console.error("OAuth error:", error);
    res.writeHead(500);
    res.end("OAuth authorization failed.");
  }
});

server.listen(3000, () => {
  console.log("Listening for authorization callback on http://localhost:3000/oauth2callback ...\n");
});
