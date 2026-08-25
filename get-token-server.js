const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open'); // if they have it, but we can just ask them to click
const readline = require('readline');
require('dotenv').config(); 

const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log("⚠️  Credentials not found in .env file.");
    clientId = await askQuestion('Client ID: ');
    clientSecret = await askQuestion('Client Secret: ');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim(),
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', 
    scope: SCOPES,
  });

  const server = http.createServer(async (req, res) => {
    try {
      const qs = new url.URL(req.url, `http://localhost:${PORT}`).searchParams;
      const code = qs.get('code');
      
      if (code) {
        res.end('Success! You can close this tab and check your terminal.');
        server.close();
        
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ SUCCESS! Here is your new Refresh Token:\n');
        console.log('----------------------------------------------------');
        console.log(tokens.refresh_token);
        console.log('----------------------------------------------------\n');
        console.log('Copy the string above and paste it as GOOGLE_REFRESH_TOKEN in Vercel.');
        process.exit(0);
      } else {
        res.end('No code found in URL. Try again.');
      }
    } catch (e) {
      res.end('Error generating token. Check terminal.');
      console.error(e);
      process.exit(1);
    }
  }).listen(PORT, () => {
    console.log('\n====================================================');
    console.log('🔗 1. Important: Go to Google Cloud Console');
    console.log(`   and add "${REDIRECT_URI}" to "Authorized redirect URIs" for your client.`);
    console.log('\n🔗 2. Then, click this link to authorize:');
    console.log(authUrl);
    console.log('====================================================\n');
    console.log('Waiting for authorization (server listening on port 8080)...');
  });
}

main();
