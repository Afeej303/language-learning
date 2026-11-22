# Darul Huda Arabic Studio

A self-hosted bilingual Arabic learning PWA for lab computers and shared tablets. Students receive a separate reading, grammar, vocabulary and translation path. Teachers maintain approved content and inspect student progress. Seed content is draft by default.

## Quick demo

With Node.js 24 installed, run `npm run demo` from this folder and open http://localhost:3000. The terminal prints unique passwords for the **student** and **teacher** usernames. The demo creates a disposable approved bank on localhost, cleans it up on normal shutdown, and starts fresh each time. Use the persistent setup below for classroom accounts.

## Run locally

Install Node.js 24 LTS. Extract this archive, open a terminal in the folder containing package.json, and run the commands below. No npm install, external DB service, or frontend build is needed. No accounts or credentials ship in the archive.

### Windows PowerShell

```powershell
npm run seed
$env:ACCOUNT_PASSWORD = Read-Host "Choose student password (10+ characters)" -MaskInput
npm run account -- student01 student
$env:ACCOUNT_PASSWORD = Read-Host "Choose teacher password (10+ characters)" -MaskInput
npm run account -- teacher01 teacher
Remove-Item Env:ACCOUNT_PASSWORD
npm start
```

The masked prompt uses PowerShell 7.1+. For Windows PowerShell 5.1 use `[System.Net.NetworkCredential]::new('', (Read-Host -AsSecureString 'Password')).Password` on the right of each assignment. If PowerShell blocks npm.ps1, use npm.cmd.

### Linux / Bash

```bash
npm run seed
read -rsp 'Student password: ' ACCOUNT_PASSWORD; echo; export ACCOUNT_PASSWORD
npm run account -- student01 student
read -rsp 'Teacher password: ' ACCOUNT_PASSWORD; echo
npm run account -- teacher01 teacher
unset ACCOUNT_PASSWORD
npm start
```

Open http://localhost:3000 on the host. Seeding again fills missing seed IDs and preserves teacher edits and moderation. Use a different username for each student.

## Try the complete student flow

1. On a disposable test installation, approve the sample bank. In Bash run `NODE_ENV=development npm run dev:approve`. In PowerShell set `$env:NODE_ENV='development'`, run `npm run dev:approve`, then `Remove-Item Env:NODE_ENV`. This approves **every draft**, including teacher-created items. Set DB_FILE consistently across all commands if using a separate demo database.
2. Sign in as student01. Start placement. The first item targets A2. The test rotates skills, records each response, and ends after 20, 24 or 28 answers. Refresh or sign out and return to check resume.
3. Open a skill's lesson, read both explanations and its worked example, then do practice. Take its checkpoint. Deliberately miss enough questions to score below 80%. The path shows the specific missed lessons. Answer those review items correctly, then retry the checkpoint.
4. Pass the remaining units in that skill's band. Its next level opens independently. Completing B1 ends the taught path. Vocabulary items answered today become due about 24 hours later. The dashboard displays the due count.
5. Sign out, sign in as teacher01, and inspect student progress and weak points. Select a question, edit it and save it as draft or approved. Create one with the blank form. Placement needs seven approved items per skill to accommodate its maximum length. For useful placement, publish material in all three bands. Practice and checkpoint need at least one approved question per point in the unit and skill.

## Content maintenance

Edit **content/syllabus.json** to change lesson order, explanations, worked examples and seed source material. The array order controls units within each level and lesson order within a unit. Each example tuple is [Arabic, English, Malayalam, target form]. The seed script creates four exercises per tuple. Existing seeded questions are edited in the teacher UI. Restart the server after editing the syllabus. Keep existing point and unit IDs stable once students have progress.

| Band | Ordered units | Content |
|---|---|---|
| A1 | script → sentences | Letters and short vowels, joining, nominal and verbal sentences |
| A2 | relations → actions | Prepositions, iḍāfa, imperfect prefixes and agreement |
| B1 | clauses → translation | Relative clauses, kāna, cause and purpose |

There are 48 A1, 36 A2 and 36 B1 questions, including four translation directions. Several prompts share a worked sentence. Treat results as instructional starting points. Expand the set of equivalent English and Malayalam translations before classroom use.

### Generate four draft questions

Set OPENAI_API_KEY in the environment or a local .env file, optionally set OPENAI_MODEL, and run `npm run draft -- nominal A1`. The given point ID and level must match the syllabus. The script sends a syllabus point description and content instructions to the API. It sends no student submissions. Generated items are multiple-choice drafts. Validate linguistic quality and approve individually in the teacher page. The API requires internet access and a funded key.

## Tests

Run `npm test`. The suite covers normalization and short-answer grading, placement movement and ceilings, 80% progression and review, B1 exit, spacing, answer projection, and an HTTP journey with a temporary database. The HTTP test seeds twice, checks the draft gate and role boundary, withdraws a live item, resumes placement, rejects stale submissions, completes review and upgrades one skill, checks the teacher report and signs out. It requires loopback TCP; the other tests are pure domain/content checks.

For device acceptance, open the app over trusted HTTPS on a lab tablet, install it, try all five input formats in both orientations, inspect Arabic combining marks and Malayalam conjuncts, and sign out before switching users. Disconnect the network and reopen the app to check the cached sign-in shell. Learning and grading require a connection.

### Ship a client update

After changing any shell asset (`public/index.html`, `app.js`, `ui.js`, `teacher.js`, `style.css`, the manifest or icons), update `BUILD_ID` in `public/sw.js` to the new shell SHA-256. Run `node scripts/check-shell-version.js` (also included in `npm test`) and `npm test`; it fails if a shell file changed without a matching cache version. Deploy the complete release together. Connected clients fetch shell assets network-first; installed service workers activate immediately and reload the page once it is safe. Offline clients use their last cached copy until they reconnect.

To force-clear a lab device's cached app, reconnect it, open the app's site settings, clear **site data/storage** for the college app origin, then close all app tabs and reopen the site. If site settings are unavailable, use the browser's developer tools: Application/Storage → Service Workers → **Unregister**, then Clear storage → **Clear site data**. Reopen while connected to install the current release. Repeat on each installed tablet/browser profile.

## Self-hosting

Run the server as a dedicated OS user with write access to its data directory. Set DB_FILE to an absolute path on local persistent storage. For a TrueNAS-hosted deployment, mount a persistent dataset into the application container for the database. Keep SQLite's database and journal files on the same local mounted volume. Run a single Node process. PORT defaults to 3000 and HOST to 0.0.0.0. Keep the lab service inside the college network.

For tablet installation, terminate trusted HTTPS on a reverse proxy. For example, with Caddy and a college-managed hostname and certificate, use the following site block and set HOST=127.0.0.1 and SECURE_COOKIE=1 on the Node service. Supply the institution's actual paths and hostname. Configure lab DNS and tablet trust for that certificate. Plain LAN HTTP can demonstrate the web UI, while PWA installation and service workers require a secure context (localhost also works).

```caddy
arabic.example.edu {
    tls /etc/college/cert.pem /etc/college/key.pem
    reverse_proxy 127.0.0.1:3000
}
```

Use a service manager to start `node server.js` with the project as working directory, restart it on failure and preserve the environment. Back up by stopping the service and copying the entire data directory, then restart it. Restore into a separate stopped instance to verify the backup. Students should explicitly sign out on shared tablets. Sessions expire after eight hours. The service worker caches only public assets. Bump its cache version when deploying changed frontend files.

## Maintainer map

- src/auth.js isolates account creation, login, session lookup and logout.
- src/db.js owns schema and transaction handling. Questions have explicit metadata columns and JSON exercise payloads. Learner state is keyed by user and language.
- src/content.js validates all teacher and generated questions. src/grade.js owns normalization and matching.
- src/placement.js, path.js and vocab.js implement learning rules. learning.js applies them to resumable activities.
- server.js handles same-origin HTTP requests and role checks. public/ contains the browser UI, web manifest and public-only service worker.
- scripts/ contains account provisioning, idempotent seeding, development approval and API drafting.
- DECISIONS.md records assumptions, pilot limits and future ideas. Git history contains the nine development milestones.
