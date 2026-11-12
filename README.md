# CareTrack

A functional quarantine-facility prototype using React, Vite, Vercel Node API functions, and Supabase PostgreSQL. All records are fictional. The role switcher is demonstration access, and visitors share one demonstration dataset.

## Review the prototype

Open `CareTrack_Preview.html` from the package root in Chrome or another modern browser. It contains all four roles and working actions. This offline review uses temporary memory and resets on reload. The deployable app in `caretrack/` uses the server API and persists records in Supabase when configured.

## Run locally

Use Node.js 22 or newer.

```sh
cd caretrack
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Without Supabase environment variables, local development persists demonstration records in `.data/demo.json`. To connect Supabase locally, copy `.env.example` to `.env.local` and fill in the two values. The local server loads this file automatically.

## Connect Supabase and deploy on Vercel

1. Create a Supabase project at https://supabase.com/dashboard using your own account. Complete any signup or terms prompts yourself.
2. Open the project's SQL Editor and run `supabase/schema.sql`.
3. In the Supabase project settings, find the project URL and a server secret API key. Use the new `sb_secret_...` key. Keep the secret out of chat, source control, and browser code.
4. Upload the contents of the `caretrack` folder to your own GitHub repository, excluding `node_modules`, `.data`, `.env.local`, and `dist`.
5. In Vercel, choose Add New → Project and import that repository. Framework is Vite, build command is `npm run build`, and output directory is `dist`. If the repository contains the outer folder, set Root Directory to `caretrack`.
6. Add two server environment variables in Vercel: `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Supply the values from your Supabase project. The API functions use these variables, and the client bundle receives neither value.
7. Deploy. The first request initializes 74 admitted patients and 20 historical outcomes. Open the production URL and check for “Shared records connected”.
8. Open the URL in a second browser, record a temperature in the first, and confirm it appears in the second within 10 seconds.

Alternatively, after configuring Supabase, run the official Vercel CLI from the project directory with `npx vercel`, set both environment variables in the Vercel dashboard, then deploy production with `npx vercel --prod`.

A Vercel deployment without the database variables displays a configuration error. It does not write to ephemeral production disk. No live deployment was created during preparation because Supabase configuration and Vercel account access are still pending.

## Demonstration sequence

- Nurse → Daily rounds → Needs temperature → Record temperature. Use 36.8°C for a fictional reading.
- Doctor → Daily rounds → Needs doctor review → Review patient. Save a review/treatment note.
- Doctor → Discharges → Choose an eligible patient who has not been approved. Complete their review if needed, then approve discharge.
- Admin → Discharges → Complete discharge. The bed becomes available and recovery statistics update.
- Admin → Bed management → Select the available bed → Admit a fictional patient.
- Management → Outcomes → Review recovery/mortality, then Activity log.
- Doctor → Open an active patient's record → Record deceased outcome. Confirm the fictional outcome and view the updated mortality warning under Management.

Some patients start with discharge approval so the admin workflow can be demonstrated immediately. Completed history starts with 17 recoveries and 3 deaths, giving 85% recovery and 15% mortality.

## Screens

Role dashboards, active and historical patient lists, patient detail with temperature chart and doctor notes, daily rounds, temperature entry, doctor review, discharge approval, admin discharge confirmation, ward/bed map, admission form, outcome dashboard, activity log, and demo/protocol guide. Layouts include responsive rules for desktop and phone screens.

## Rules and assumptions

- The prototype assumes fever at 38.0°C or above. The facility must confirm its actual threshold.
- All daily boundaries use Asia/Kolkata time. Each admitted patient can have one daily temperature reading and one daily doctor review.
- Doctor review requires today's temperature. Recovery eligibility requires at least 72 elapsed hours of fever-free readings, with no missing calendar day through today. A fever or missing day breaks the sequence.
- Doctor approval follows today's review. Admin discharge rechecks eligibility and today's review. A new fever clears an existing approval.
- Successful recovery is counted on completed discharge. Mortality and recovery denominators include only completed outcomes. Active patients are excluded.
- A deceased outcome recorded by the doctor releases the bed and updates management reporting.
- Server validation restricts actions by the selected demo role. The role switcher is not staff authentication. Use fictional information only.
- Supabase updates use revision-based compare-and-swap with retries, preventing lost concurrent updates. Request IDs make successful action retries idempotent. Bed availability and care rules are checked again during each update.

## Verification

```sh
npm test
npm run build
```

Eight domain workflow tests pass. They cover the complete care-to-admission sequence, duplicate readings, invalid temperatures, action permissions, occupied beds, the 72-hour rule, missing days, stale discharge checks, retry idempotency, death reporting, and approval clearing after fever.

The production bundle builds successfully. Interactive browser testing was blocked by the preparation environment's local-server and file-URL restrictions. Supabase connectivity, multi-device synchronization, and Vercel deployment require verification after account configuration.
