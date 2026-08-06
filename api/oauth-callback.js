import { google } from "googleapis";

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) {
    res.status(400).send("Missing authorization code.");
    return;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `https://${req.headers.host}/api/oauth-callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
      <html>
        <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 60px auto; line-height: 1.6; color: #1A1A1A;">
          <h2>Connected!</h2>
          ${
            tokens.refresh_token
              ? `<p>Copy the value below and paste it into Vercel as the <code>GOOGLE_REFRESH_TOKEN</code> environment variable, then redeploy.</p>
                 <textarea style="width: 100%; height: 100px; font-family: monospace; padding: 8px;" readonly onclick="this.select()">${tokens.refresh_token}</textarea>`
              : `<p><strong>No refresh token was returned.</strong> This usually happens if you've authorized this app once already.</p>
                 <p>Go to <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>, find and remove access for this app, then reload this same link again.</p>`
          }
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Error exchanging code: " + err.message);
  }
}
