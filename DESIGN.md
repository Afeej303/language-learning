# Arabic Studio Design System

This token system documents the current UI visual language and names existing values for a later, screenshot-verified refactor. It does not change product code. Keep the app legible on shared lab computers and tablets, support English and Malayalam instructions alongside Arabic stimuli, and retain independent bidirectional text handling.

## Brand and visual direction

- **Product:** Darul Huda Arabic Studio, a focused bilingual Arabic-learning tool for shared devices.
- **Visual character:** warm paper, deep college green, restrained antique-gold accents, serif editorial headings, and a light, low-decoration workspace.
- **Preservation rule:** initially map the current CSS literals to these tokens without changing computed appearance. Make visual changes only after screenshot evidence and acceptance.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-ink` | `#193c34` | Main body text and foreground on light surfaces |
| `--color-ink-muted` | `#52635b` | Secondary text and metadata |
| `--color-ink-soft` | `#5a675d` | Supporting bilingual text and footer copy |
| `--color-brand` | `#1c5144` | Primary actions, focusable controls, progress accent |
| `--color-brand-deep` | `#173f35` | Hero surface |
| `--color-seal` | `#163e36` | Institutional seal and theme color |
| `--color-paper` | `#f5f3eb` | Page background |
| `--color-surface` | `#fffdf7` | Main cards and learning sections |
| `--color-surface-header` | `#fffdf6` | Header surface |
| `--color-surface-option` | `#fffefa` | Unselected answer tile |
| `--color-border` | `#d9d9ca` | Main section outline |
| `--color-border-header` | `#dcdacc` | Header/footer divider |
| `--color-border-soft` | `#deded1` | Secondary dividers |
| `--color-control-border` | `#adb9ae` | Form fields |
| `--color-option-border` | `#c4c9ba` | Unselected choice tile |
| `--color-accent-gold` | `#b49754` | Arabic stimulus rule and muted gold details |
| `--color-accent-gold-light` | `#ecd49d` | Seal foreground |
| `--color-accent-gold-pale` | `#e5d5a8` | Hero eyebrow and subtitle |
| `--color-wordmark` | `#c9b780` | Decorative Arabic hero wordmark |
| `--color-band-border` | `#bbaa75` | CEFR band badge outline |
| `--color-band-ink` | `#6d5525` | CEFR band badge text |
| `--color-reading-surface` | `#f3efe2` | Arabic stimulus and assembled answer background |
| `--color-selection` | `#e7f0e7` | Selected answer background |
| `--color-notice` | `#f4e5bf` | Shared status/error notice |
| `--color-focus` | `#bd8c30` | Keyboard focus outline |
| `--color-option-number` | `#f0eee4` | Unselected numeric tile marker |

## Typography

Current intended stacks with Arabic and Malayalam script faces self-hosted for reliable offline rendering:

| Token | Current stack | Use |
| --- | --- | --- |
| `--font-body` | `"Source Sans 3", "Noto Sans Malayalam", system-ui, sans-serif` | Latin interface text first; bundled Malayalam face applies only to Malayalam Unicode characters |
| `--font-heading` | `"Spectral", Georgia, "Noto Serif Malayalam", serif` | Latin heading text retains Spectral/Georgia; bundled Malayalam serif applies only to Malayalam characters |
| `--font-arabic` | `"Noto Naskh Arabic", Georgia, serif` | Arabic content, prompts, examples, choice text |
| `--font-field-mono` | `ui-monospace`/browser monospace at `.9rem/1.4` | Teacher multiline content fields |

`public/style.css` self-hosts Noto Sans Malayalam, Noto Serif Malayalam, and Noto Naskh Arabic from `public/fonts/`; script-specific `unicode-range` declarations prevent the Malayalam faces from replacing Latin text and keep Naskh scoped to Arabic characters. The service worker includes all three files in its network-first, offline-fallback shell. The supplied files are unmodified Noto fonts under SIL OFL 1.1, with the license copied to `public/fonts/OFL.txt`. Source Sans 3, Spectral, and Georgia retain their existing Latin priority. Arabic uses RTL for Arabic-only answer lines and `dir="auto"` for mixed content; Malayalam remains left-to-right. Do not reverse source strings manually.

| Role | Current size/line height |
| --- | --- |
| Body | Root size `1rem`; line-height `1.55` |
| Hero title / `h1` | `clamp(2.25rem, 6vw, 4.5rem)`; line-height `1.15` |
| Section heading / `h2` | `1.8rem`; line-height `1.15` |
| Eyebrow | `.72rem`, bold, `.15em` letter spacing |
| Malayalam companion copy | `.92rem` |
| Arabic text | `1.55rem`, line-height `1.9` |
| Arabic option tile | `1.45rem`, line-height `1.35` |
| Long answer sentences | `1rem`, line-height `1.4` |
| Footer | `.85rem` |

## Spacing, shape, and layout

The current sheet uses rem-based spacing directly rather than a declared scale. These aliases preserve those current values:

| Token | Value | Current role |
| --- | --- | --- |
| `--space-1` | `.35rem` | Field inner vertical gap |
| `--space-2` | `.4rem` | Compact option tile padding |
| `--space-3` | `.5rem` | Choice grid gap |
| `--space-4` | `.65rem` | Button and form-field padding |
| `--space-5` | `.8rem` | Brand/header gap |
| `--space-6` | `1rem` | Main grid gap and section spacing |
| `--space-8` | `1.2rem` | Small-screen card padding |
| `--space-12` | `1.8rem` | Main content top padding |
| `--space-16` | `2.2rem` | Large card padding |

| Token | Value | Use |
| --- | --- | --- |
| `--radius-control` | `4px` | Inputs, selects, textareas |
| `--radius-card` | `6px` | Sections and form cards |
| `--radius-button` | `5px` | Buttons and choice tiles |
| `--radius-pill` | `99px` | CEFR band badge |
| `--content-max` | `1112px` | Main content width |
| `--content-inset` | `1rem` | Main horizontal padding |
| `--wide-breakpoint` | `650px` | Student grids and choice grid switch |
| `--touch-min` | `44px` | Button and answer tile minimum height |

The header uses a flexible side-by-side brand/account layout, with compact padding and a wrapping account group on narrow screens. Main student skill cards use two columns above 650px and one below. Choice tiles use two columns at and above 650px, one column below; short Arabic choices use `auto-fit` with an approximately `9rem` minimum, and long English answer sentences use a single column. Validate these existing branches at 375, 768, and 1280 CSS pixels before tuning.

## Components and states

- **Global shell:** institutional seal, product name, account actions, live status notice, centered main region, institutional footer.
- **Hero:** deep-green field, warm text, oversized low-opacity Arabic decorative wordmark.
- **Section/card:** warm-white surface with a thin warm-gray border and restrained radius.
- **Primary button:** brand-green fill with white text; minimum 44px target.
- **Quiet button:** transparent fill with brand-green text.
- **Form control:** white surface, muted green border, full-width block; text direction follows content.
- **Choice tile:** compact border tile, number marker, keyboard-focus outline, clear selected background/border, hidden-but-focusable native radio.
- **Arabic stimulus:** reading-paper surface and gold inline-start rule; Naskh intended face; source text is not manually reordered.
- **Progress:** full-width native `progress` with green accent and an accessible label.
- **Status notice:** warm highlighted background; existing `role="status"` and polite live announcement remain intact.
- **Bilingual copy:** English remains the primary language; Malayalam companion copy uses `.ml`, and `ui.js` sets `lang` and `dir` for detected script content.

## Responsive and direction rules

- Use logical properties (`margin-inline`, `padding-inline`, `inset-inline-*`, `border-inline-start`) for direction-sensitive layout.
- Preserve both script order and semantic order; use `dir="auto"` on mixed text and inputs, explicit RTL only for Arabic assembly lines or Arabic-only stimulus.
- At 375px, maintain one-column content, compact controls, no horizontal overflow, and readable Arabic/Malayalam wrapping.
- At 768px, verify two-column learning cards and answer tiles fit without clipping, hidden choices, or unintended scroll.
- At 1280px, hold content to `1112px` and keep teacher tools and reports within that readable column.
- These are validation targets; no rendered browser evidence was available during this audit.

## Accessibility and interaction invariants

- Preserve keyboard focus visibility and native radio keyboard behavior; numeric shortcuts 1–5 supplement rather than replace selection and Submit.
- Keep touch targets at least 44px high.
- Keep progress labels, live status, labels attached to controls, and sign-out available in the global shell.
- Never use color alone to show answer selection or status.
- Keep feedback, resume, exit-to-home, withdrawn-question recovery, and teacher approval actions discoverable and operable by keyboard.
- Any future component/layout changes must keep all current API-backed behavior and 100% of user-facing flow states described in `REDESIGN_PLAN.md`.
