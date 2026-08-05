# IJAM Housing — Rental Application (Standalone Web App)

This is a standalone version of the Rental Application, built to run as a
real website instead of inside Claude. It uses a **Google service account**
to create and share the submitted application in Google Drive — applicants
never need to log into Google themselves.

## How it works

1. Applicant fills out the form in their browser and signs (typed signature).
2. The browser sends the completed application to `/api/submit-application`
   (a small backend function — the code for this never runs in the browser,
   so no secrets are exposed).
3. That backend function, using a Google service account, creates a Google
   Doc in a specific Drive folder you control, and shares it with the
   applicant's email and your org email. Google automatically emails both
   people a link — no separate email service needed.

No Anthropic/Claude API key is used anywhere in this version.

---

## One-time setup

### 1. Google Cloud — service account (~10 minutes)

Since you're using a new/different Google account for this one, do all of
this while logged into that account.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a new project (e.g. `ijam-housing-forms`).
2. In the search bar, find **Google Drive API** and click **Enable**.
3. Go to **IAM & Admin → Service Accounts → Create Service Account**.
   - Name it something like `ijam-drive-submitter`.
   - You don't need to grant it project-level roles — skip that step.
4. Click into the new service account → **Keys** tab → **Add Key → Create
   new key → JSON**. This downloads a `.json` file — keep it safe, it's a
   credential, not something to commit to GitHub.
5. Open that JSON file and copy the `client_email` value (looks like
   `ijam-drive-submitter@ijam-housing-forms.iam.gserviceaccount.com`).

### 2. Google Drive — share a folder with the service account

1. In Google Drive (on the account you want submissions to land in — could
   be `Ijamhousing@gmail.com` itself, or a different one), create a folder,
   e.g. **"Rental Applications."**
2. Right-click → **Share** → paste in the service account's `client_email`
   from above → give it **Editor** access → Send (no notification needed).
3. Open the folder and copy its ID from the URL:
   `https://drive.google.com/drive/folders/`**`THIS_PART_IS_THE_FOLDER_ID`**

### 3. Encode the service account key for Vercel

Vercel environment variables need to be plain text, so the JSON key gets
base64-encoded into one line first. In a terminal:

```bash
base64 -i path/to/your-service-account-key.json | tr -d '\n' > key-base64.txt
```

You'll paste the contents of `key-base64.txt` into Vercel in the next step.

### 4. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, **New Project → Import** that repo.
3. Before deploying, add these **Environment Variables**:
   | Name | Value |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` | contents of `key-base64.txt` |
   | `DRIVE_FOLDER_ID` | the folder ID from step 2 |
   | `ORG_EMAIL` | `Ijamhousing@gmail.com` |
4. Deploy. Vercel auto-detects the Vite frontend and the `/api` folder as
   serverless functions — no extra config needed.

That's it — once deployed, anyone with the link can fill out and sign the
application, and both the applicant and `Ijamhousing@gmail.com` will get an
emailed link to the completed document.

---

## Local development

```bash
npm install
npm run dev
```

The frontend will run, but `/api/submit-application` calls will only work
when deployed to Vercel (or run locally via `vercel dev`, which requires the
[Vercel CLI](https://vercel.com/docs/cli) and the same environment variables
set in a local `.env` file).

---

## Notes

- The form auto-saves progress to the browser's local storage as the
  applicant fills it out — if they accidentally close the tab, their
  answers are still there when they come back on the same device.
- If you'd rather generate an actual PDF instead of a Google Doc, that's a
  bigger change (would need a PDF library in the backend) — just ask and
  I can build that version instead.
