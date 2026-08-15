import { google } from "googleapis";

export function getOAuthClient() {
  if (!process.env.GOOGLE_REFRESH_TOKEN) throw new Error("Missing GOOGLE_REFRESH_TOKEN environment variable.");
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

export function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
