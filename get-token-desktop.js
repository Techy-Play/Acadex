const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const readline = require('readline');
require('dotenv').config(); 

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

  // Create server first to dynamically grab a free port
  const server = http.createServer();
  
  server.on('request', async (req, res) => {
    try {
      const address = server.address();
      if (!address) {
        res.end(); // Server is closing, ignore request
        return;
      }
      
      const port = address.port;
      const qs = new url.URL(req.url, `http://127.0.0.1:${port}`).searchParams;
      const code = qs.get('code');
      
      if (code) {
        res.end('Success! You can close this browser tab and check your terminal.');
        server.close();
        
        const oauth2Client = new google.auth.OAuth2(
          clientId.trim(),
          clientSecret.trim(),
          `http://127.0.0.1:${port}`
        );
        
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
  });

  // Listen on port 0 to let the OS assign a random available port
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    const REDIRECT_URI = `http://127.0.0.1:${port}`;
    
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

    console.log('\n====================================================');
    console.log('🔗 Click this link to authorize:');
    console.log(authUrl);
    console.log('====================================================\n');
    console.log(`Waiting for you to log in (server listening on port ${port})...`);
  });
}

main();
