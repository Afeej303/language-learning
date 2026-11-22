# Arabic Studio UI and UX Redesign Plan

**Audit target:** Darul Huda Arabic Studio PWA, as represented by the current working tree on `focused-bulldog` (base `94dbdcb`, with local uncommitted UI changes). The latest committed service-worker changes were inspected in the writable clone at `ddad0d1`.

**Constraints:** This is a documentation-only handoff. Do not change application code until this plan is selected for implementation. Preserve every existing role, screen, activity, state transition, endpoint, grading rule, approval control, import/export action, progress record, and offline behavior.

**Visual validation limitation:** Browser automation was unavailable, and no rendered screenshot was available. Findings below are supported by the live source path and direct content duplication; claims about visual hierarchy, perceived density, and actual glyph rendering remain subject to screenshot verification at the viewports listed below.

**Implementation status:** Steps 2 and 3 have source-level implementations in the redesign branch: teacher per-student data is consolidated into one dashboard card and Noto Arabic/Malayalam fonts are locally served. Rendered viewport and offline-device verification remain pending because the browser host is unavailable.

## Design language

- **Audited surface:** The single client-rendered PWA at `/`: sign-in, student learning path and activities, and teacher question and progress tools.
- **Design sources:** `public/index.html`, `public/app.js`, `public/teacher.js`, `public/ui.js`, `public/style.css`, `public/sw.js`, `content/syllabus.json`, `DECISIONS.md`, and `README.md`.
- **Documented decisions:** English and Malayalam are paired; Arabic stimuli and inputs have independent direction; teaching levels and paths are per skill; question moderation gates student exposure; server-backed activities resume; only the public shell is cached; CEFR levels are local estimates.
- **Governing owners and consumers:** `public/style.css` owns visual tokens and global layout; `public/ui.js` owns element, field, bilingual section, notice, and bidi helpers; `public/app.js` owns student states; `public/teacher.js` owns the teacher workspace; `public/index.html` owns the global shell.
- **Explicit exceptions:** Teacher authoring labels are principally English; question prompts and examples are bilingual. No other deliberate visual exceptions are documented.

## Screen and flow inventory

The application is a single-page client with no path-based subroutes. These screens are states rendered into `main`.

| Screen/state | Entry and primary actions | Exit/next state |
| --- | --- | --- |
| Sign-in | Unauthenticated visit or sign-out; enter username and password | Student home or teacher workspace after authentication |
| Student home before placement | First student sign-in; start or resume placement | Placement activity |
| Student learning path | Placement complete; inspect per-skill CEFR lane, units, lessons, examples, due vocabulary | Practice, checkpoint, targeted review, vocabulary activity, or resume card |
| Open-activity resume card | Student home with a saved run; resume same question | Matching activity state |
| Placement activity | Adaptive question sequence | Per-answer feedback, then placement result and initialized skill lanes |
| Practice activity | Choose a skill’s current unit | Per-answer feedback, then unit result/home |
| Checkpoint activity | Available after practice | Pass and progress, or targeted review on failed points |
| Targeted review activity | Checkpoint failure | Review feedback, then checkpoint retry or path |
| Vocabulary review | Due vocabulary on student home | Answer feedback and updated review schedule |
| Question activity variants | Choice, blank, reorder, match, or translation question | Feedback: correct or wrong, accepted answer and bilingual explanation/lesson fallback |
| Withdrawn-question state | Active item is withdrawn/revised before answer | Exit to home or refresh/restart activity |
| Teacher question workshop | Teacher sign-in; create/edit question, filter status, import CSV, download template, export bank | Saved question list/status; report feedback |
| Common wrong answers | Teacher workspace | Review frequent typed answers and accept a variant |
| Student progress | Teacher workspace | Inspect per-student levels and weak points |
| Class dashboard | Teacher workspace | Inspect activity time, per-point accuracy, and weakest grammar points |
| Sign-out | Account control in global header | Sign-in screen; server session invalidated |

### Primary user flows

1. **Student onboarding:** Sign in → placement → answer feedback → independent reading/grammar/vocabulary/translation starting levels → student path.
2. **Learning cycle:** Path → lesson and worked example → practice → feedback → checkpoint → either passed-unit progression/level upgrade or targeted review → checkpoint retry.
3. **Resume and recovery:** Reload/sign-in → home → resume open activity at same question; withdrawn item → exit home or refresh activity. Exit-to-home retains server-side run and results.
4. **Vocabulary:** Path → due count → vocabulary review → answer feedback → spaced interval update → return home.
5. **Teacher content lifecycle:** Teacher sign-in → question list/filter → create or edit → save as draft/in review → different teacher approves → student-visible approved bank. CSV template/import/export shares the same validation/moderation rules.
6. **Teacher insight:** Teacher sign-in → student progress and class dashboard → frequent typed wrong answer → one-click addition as accepted answer → inspect updated bank.

## Findings supported by current evidence

The source proves only the following findings without a rendered session. Do not treat the visual-validation checklist as a claim that these defects have been observed in a browser.

| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Per-student progress is rendered twice in the teacher workspace, once under “Student progress” and again under “Class dashboard”; both contain student names and overlapping level/performance data. | `public/teacher.js` appends a complete `reports` section and then a `dashboard` section to the same `main`; both loop over `students` and render a card per student. | Keep one per-student summary in the dashboard and retain the separate aggregate weakest-topics summary; remove the duplicate per-student presentation while preserving every data field and report action. | Teacher workspace only. | High |
| 2 | The stylesheet names Source Sans 3, Noto Sans Malayalam, and Noto Naskh Arabic as preferred faces, but `public/index.html` loads no font stylesheet and the inspected public tree contains no font assets. Actual Arabic/Malayalam faces therefore depend on fonts already installed on each lab device. | `public/style.css` font stacks at root and `.arabic`; `public/index.html` includes only `/style.css`; public files contain no font resources. | Bundle/self-host the selected script fonts or explicitly document/test supported system fallback stacks, then verify shaping, diacritics, and line wrapping offline on lab devices. | Global UI, especially Arabic question content, Malayalam instructions, and bilingual controls. | High for missing delivery path; actual rendered fallback glyphs unverified. |

No additional visual or usability flaws are asserted without rendered evidence. In particular, spacing, hierarchy, visual contrast, actual RTL alignment, mobile overflow, and teacher-page density must be reviewed from screenshots before they are recorded as defects.

## Step-by-step redesign and validation plan

1. **Capture the baseline.** Run the current app with a seeded demo bank. Capture sign-in, student home before placement, post-placement path, each question type, correct/wrong feedback, checkpoint failure/review, vocab review, withdrawn item, teacher workshop, wrong-answer list, student progress, dashboard, and sign-out. Capture 375px, 768px, and 1280px widths. Keep screenshots as audit artifacts; do not alter code in this phase.
2. **Complete — consolidate teacher progress presentation.** Per-student levels, passed units, last activity, all-skill/per-point accuracy, placement count, and weak-point signal now render once inside one dashboard card per learner; class weakest grammar topics and all question-management/report workflows remain. Verify empty and populated states in a browser.
3. **Implemented — make script typography deterministic.** Locally served OFL Noto Sans Malayalam, Noto Serif Malayalam, and Noto Naskh Arabic are bundled and included in the offline shell; unicode ranges preserve the existing Latin font priority. Verify shaping and wrapping with vowelled Arabic, mixed Arabic/Latin, Malayalam conjuncts, and long text on target browsers. Screenshot verification is outstanding because the browser host is unavailable.
4. **Review role entry and global shell.** Check header/account controls, brand and seal, message region, sign-in labels, narrow widths, and focus/read state. Keep role-specific home routing and sign-out. Adjust only issues demonstrated in baseline screenshots.
5. **Review student home and path.** Inspect before/after placement, four skill lanes, band/unit progress, lesson disclosures, worked examples, due-vocabulary count, active resume card, and completed-path state. Preserve per-skill progression and all lesson content while refining grouping and scan order only where the screenshots show friction.
6. **Review activity and feedback states.** Inspect each of the five question formats, Arabic stimulus/input direction, tile/grid behavior, keyboard choices, progress indicators, exit-to-home, correct/wrong feedback, answer/explanation fallback, and withdrawn-question recovery. Keep the exact grading and progression contract. Verify all controls remain reachable and the same run resumes without score or answer loss.
7. **Review teacher question workshop.** Inspect create/edit/approved/in-review/draft states, filter behavior, syllabus selection, multiline answers/options/pairs, explanations, creator/approver metadata, and save errors. Group the fields by authoring task without removing or renaming a supported field or transition. Retain template download, import row errors, and full-bank export.
8. **Review teacher reports.** Inspect empty/populated wrong-answer reports and accept action, class dashboard levels/accuracy/last activity/weakest points, and any duplicate progress. Keep the 3+ occurrence and 50-row report behavior and all four-skill accuracy calculations.
9. **Apply tokens from `DESIGN.md`.** Replace repeated literal values with named CSS custom properties without changing their computed values in the first pass. Add only the font assets and spacing/layout refinements accepted after screenshots. Keep global owners in `public/style.css` and existing helpers in `public/ui.js`; avoid a second component system.
10. **Regression verification.** Run `npm test`, the shell-version guard, and the cache-version guard after every shell edit. Compare route/state screenshot set at 375/768/1280px. Check normal network, offline shell fallback, and first-load service-worker install; verify Arabic/Naskh and Malayalam shaping on a lab target. Ensure all original student, teacher, moderation, import/export, grading, placement, retry, resume, and reporting flows still work.

## Preserve these behaviors

- Student and teacher authentication, role separation, sign-out, and feedback/error messages.
- Per-skill adaptive placement, CEFR estimates, independent learning lanes, unit practice/checkpoint/review gates, level upgrades, and completion states.
- All five question types, grading and answer alternatives, Arabic direction, bilingual prompts, explanations, feedback, progress, resume, and withdrawn-item recovery.
- Vocabulary scheduling and due reviews.
- Teacher create/edit/filter, draft → in-review → approval attribution, only-approved student serving, question import/export/template, frequent wrong-answer review/acceptance, and student/class reports.
- Network-first service-worker shell updates with offline fallback, immediate worker activation, guarded reload while an answer is being edited, and version-change checks.

## Assumptions and limits

- The audit covers the single PWA client, not hosting administration, account provisioning scripts, or API behavior beyond its visible UI states.
- The working tree contains uncommitted changes. This handoff was based on the effective local UI source in the current checkout; latest committed service-worker behavior was cross-checked from commit `ddad0d1` in the writable clone.
- Browser automation was unavailable, so no screenshot-grounded claims or actual viewport checks are represented as completed.
- No user research or classroom observation was supplied. Changes beyond the two source-proven findings remain contingent on the screenshot review in step 1.
