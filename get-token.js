const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config(); 

const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
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
    console.log("⚠️  Credentials not found in .env file. Please paste them below from your Google Cloud Console:");
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

  console.log('\n====================================================');
  console.log('🔗 1. Click this link (or copy/paste into browser):');
  console.log(authUrl);
  console.log('====================================================\n');

  const code = await askQuestion('📋 2. After logging in, paste the authorization code here: ');
  
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    
    console.log('\n✅ SUCCESS! Here is your new Refresh Token:\n');
    console.log('----------------------------------------------------');
    console.log(tokens.refresh_token);
    console.log('----------------------------------------------------\n');
    console.log('Copy the string above and paste it as GOOGLE_REFRESH_TOKEN in your Vercel settings.');
    
  } catch (err) {
    console.error('\n❌ Error retrieving access token:', err.message);
  } finally {
    rl.close();
  }
}

main();
