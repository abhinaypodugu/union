# Commons Design System

Design system for a **multi-tenant, domain-agnostic membership, community and issue-management platform**: associations, federations, unions, clubs. Each organization (tenant) configures its own geography (Country → State → City…), functional groups, committees, governance and terminology.

**Working name:** "Commons". No brand name or logo was supplied, so the name is set in display type wherever a mark would go. Replace it once the real brand exists. The sample tenant in the UI kits ("Deccan Workers' Federation") and all of its people are synthetic.

## Sources
- `uploads/union_platform_prd (1).md` — PRD v1.2 (10 Oct 2026). This is the source of truth for domain concepts, roles, statuses, notification rules and privacy rules.
- Architecture guidance pasted by the user. Mobile: **Expo + React Native + gluestack-ui v5 / NativeWind v5**. Admin web: **Next.js + shadcn/ui + Tailwind**. The two platforms share one framework-independent token spec. This repo is that spec, plus HTML/React recreations used for design work. Map `tokens/*.css` into the Tailwind theme and the NativeWind config.
- No codebase, Figma or existing UI was provided. Every visual decision here is original.

## Products
1. **Member app** (mobile): social-style home feed, groups, private issue tracking, notifications, org chart and profile. → `ui_kits/member-app/`
2. **Admin / leadership dashboard** (web): issue queues, escalations, committees and appointments, audience-targeted announcements, and configuration. → `ui_kits/admin-dashboard/`

---

## CONTENT FUNDAMENTALS
- **Voice:** calm, plain and accountable, like a good shop steward. We explain *who* is handling something and *what happens next*. We never hype.
- **Person:** speak to the member as **"you"**. The organization speaks as its committee ("Telangana State Committee"), never as "we, the app".
- **Casing:** sentence case everywhere: buttons, titles, tabs ("Raise an issue", "Escalate case"). UPPERCASE is used only for mono overlines ("OFFICIAL ANNOUNCEMENT").
- **Buttons are verbs:** "Assign", "Escalate case", "Publish & notify", "Send reply". Avoid "OK" and "Submit" when a precise verb exists.
- **Always say the consequence:** "The receiving committee gets the complaint, attachments, timeline and your reason." "Sends a push notification to everyone above."
- **Privacy copy is explicit:** "Private to you and assigned handlers". "Internal committee notes aren't shown here". "Committee-private · not visible to members".
- **Case notifications stay generic** (PRD §11.2): "There is an update to your case CASE-1988". Never include complaint details.
- **Terminology is configurable.** Copy uses tenant labels (State/Province/Region, functional group names), so never hard-code "union". Generic nouns: organization, member, committee, functional group, issue/case.
- **Numbers:** mono for IDs and timestamps (`CASE-2041`, `12 Sep`). Write deadlines in human terms: "4d left", "Overdue 6h", "Update by 18 Oct".
- **No emoji.** No exclamation marks in system copy.

## VISUAL FOUNDATIONS
- **Vibe:** civic and trustworthy. Warm paper neutrals, one confident civic blue, editorial serif headlines, a utilitarian sans. It should feel closer to a well-set newspaper or public-service site than a startup.
- **Color:** warm paper whites (`--paper-*`, chroma ≤ 0.009) and warm inks (`--ink-*`). The one accent is **civic blue** `--blue-600`, used for primary actions, official content, focus and selection. Status hues (green, amber, red, violet) share lightness and chroma and are reserved for workflow meaning. Violet means **escalated**, and nothing else.
- **Type:** *Source Serif 4* for page titles, announcement headlines, dialog titles and metric numerals. *Public Sans* for all UI and body text. *IBM Plex Mono* for case IDs, timestamps, counts and overlines. Display type gets −0.015em tracking. Body is 15/1.5 (17 on mobile long-form).
- **Content-type language** (PRD §14.4, the core motif). Each kind of content looks different:
  - Member post: paper card with a hairline border.
  - **Official announcement:** blue flag band with a mono overline, a check-seal on the avatar, a serif headline and a 3px pale-blue halo.
  - **Committee-private:** sunken paper, a **dashed** ink border and a lock. It can't be shared.
  - **Issue:** a structured card with a mono ID, status first, then the next action and deadline. Issues never appear in the feed.
- **Backgrounds:** flat paper. No gradients, textures or full-bleed imagery in product UI. Image placeholders use a subtle diagonal stripe with a mono caption.
- **Borders before shadows:** 1px `--paper-200` hairlines define surfaces. The resting card shadow is almost invisible. `--shadow-raised` appears on hover, and `--shadow-popover` only on floating layers (dialogs, toasts, sheets).
- **Corner radii:** controls 8, chips 6, cards 12, dialogs 16, mobile sheets 24. Pills are used only for badges and counts.
- **Cards:** paper-0, hairline border, 12px radius, 14–20px padding. No colored side-borders.
- **Hover:** surfaces move one paper step darker (`--surface-hover`). Bordered controls darken their border to `--border-strong`. Primary buttons go one blue step darker. **Press:** scale to 0.98 (icon buttons 0.94). **Focus:** 3px `--blue-200` ring.
- **Selection:** pale blue fill (`--surface-selected`) plus a 1px inset blue-200 line. Filter chips select to solid ink.
- **Motion:** quick and quiet. 120ms for hover and press, 200ms for toggles and carets, 320ms for dialogs and sheets, all `--ease-out`. Overlays fade in while the panel rises 8px. Mobile sheets slide up. No bounces and no looping animation.
- **Transparency and blur:** used only on the mobile tab bar (92% paper with a 16px blur) and on modal scrims (ink at 40%).
- **Layout:** admin uses a fixed 248px sidebar, a 60px top bar, and content padded 28px. A list/detail split puts the detail pane at 440px. Mobile uses 12–16px gutters, a sticky feed filter, a fixed bottom tab bar, and tap targets of 44px or more.
- **Status is never color alone.** Badges always carry a dot or icon plus text.

## ICONOGRAPHY
- **Lucide** (ISC licence), outline style, stroke **1.75** (2 inside buttons and badges). Default size 20; 24 in the mobile tab bar, where the active tab uses a 2.1 stroke. 80 icons are copied to `assets/icons/*.svg` and inlined in `components/core/Icon.jsx` (`<Icon name="megaphone" />`). Add more from `lucide-static` as needed. On React Native use `lucide-react-native`, and on web `lucide-react`.
- Key mappings: official → `badge-check`, private → `lock`, escalated → `chevrons-up`, deadline → `timer`, overdue → `triangle-alert`, committee → `users`, functional group → `briefcase`, geography → `globe`/`map-pin`/`building-2`.
- No emoji and no unicode-glyph icons. The only custom marks are simple shapes: the 3-bar committee level indicator and the status dots.
- **Logo:** none provided. See `guidelines/wordmark.html` for the type-only placeholder.

---

## Index
- `styles.css` is the entry point (imports only).
- `tokens/`: `fonts.css` (Google Fonts), `colors.css`, `typography.css`, `spacing.css` (space, radii, shadows, motion), `base.css`.
- `components/components.css` holds all component classes (`cm-*`).
- `components/` (each component is a `.jsx` + `.d.ts` + `.prompt.md`, with one card per folder):
  - `core/`: Icon, Button, IconButton, Badge (+Count), Tag, Avatar (+AvatarStack), Card
  - `forms/`: Field, Input (+Textarea), Select, Checkbox (+Radio), Switch
  - `navigation/`: Tabs (+SegmentedControl), TabBar, SideNav
  - `feedback/`: Dialog, Toast, Tooltip, Notice
  - `domain/feed/`: PostCard, AudienceLabel, AudienceSummary
  - `domain/issues/`: StatusBadge, IssueCard (+DueLabel), EscalationTimeline
  - `domain/org/`: OrgTree, CommitteeBadge
  - `domain/activity/`: NotificationItem, MetricTile
- `guidelines/` holds the foundation specimen cards, plus `ds-loader.js` (the preview helper that loads components into cards and kits).
- `ui_kits/member-app/` is the mobile click-through: Home, Groups, Issues (list, detail, raise sheet), Alerts, Organization, Profile.
- `ui_kits/admin-dashboard/` is the web click-through: Overview, Issue queue (assign/escalate dialogs), Committees (appointments, platform-admin override), Announcement composer.
- `assets/icons/` contains the Lucide SVGs.
- `mobile/` is the **React Native (Expo, iOS + Android)** implementation: tokens in `src/theme`, every component rebuilt natively, and all member + leadership screens. See `mobile/README.md`.

### Intentional additions
There was no source component inventory, so a standard set was authored. The domain components (PostCard, IssueCard, EscalationTimeline, OrgTree, CommitteeBadge, NotificationItem, AudienceSummary, StatusBadge, AudienceLabel, MetricTile, Notice) come straight from PRD requirements and the user's requested list.
