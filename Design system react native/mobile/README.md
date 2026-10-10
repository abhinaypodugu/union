# Commons — mobile app (React Native · iOS + Android)

React Native rewrite of the Commons design system and UI kits. One Expo + TypeScript codebase for iOS and Android.

## Run it
```bash
cd mobile
npm install
npx expo install --fix   # pins every package to versions compatible with Expo SDK 57
npx expo start            # press i (iOS simulator) or a (Android emulator)
```
Expo Go works for quick previews. For store builds use `eas build -p ios` / `eas build -p android` and change `ios.bundleIdentifier` / `android.package` in `app.json`.

Requirements: Node 20+, and Xcode or Android Studio for simulators. It uses the New Architecture (the default since SDK 55), which `boxShadow` styles depend on.

## Stack
- **Expo SDK 57**, **Expo Router** (file-based navigation), **TypeScript (strict)**
- Styling: `StyleSheet`/inline styles driven by `src/theme` tokens. No UI library is needed. The components are written to drop onto gluestack-ui / NativeWind later if you want them.
- Icons: `lucide-react-native` (the same Lucide set as the web system). Fonts: `@expo-google-fonts` Source Serif 4, Public Sans, IBM Plex Mono.

## Structure
```
app/                      Expo Router routes
  _layout.tsx             fonts, safe area, store, root stack
  index.tsx               → redirects to /main
  main/_layout.tsx        bottom tabs: Home · Groups · Issues · Alerts · Organization
  main/index.tsx          Home feed (stories row, sticky filter, posts, pull-to-refresh, native share)
  main/groups.tsx         Geographic, functional-group, committee and community spaces
  main/issues.tsx         My issues (Open / Closed)
  main/alerts.tsx         Notification center (deep-links into cases / feed)
  main/org.tsx            Representatives, escalation route, org tree
  issue.tsx               Issue detail  (/issue?id=CASE-2041) — reply to info requests, timeline
  raise.tsx               Raise an issue (native modal) with validation
  profile.tsx             Membership, notification preferences, entry to Management
  manage/index.tsx        Leadership overview (metrics, needs attention)
  manage/queue.tsx        Committee issue queue
  manage/case.tsx         Case handling — assign (sheet), escalate with reason (dialog), resolve
  manage/committee.tsx    Members & appointments, nomination approval, platform-admin override
  manage/announce.tsx     Announcement composer — audience picker, count, Notify audience, preview
src/theme/                tokens.ts (colors, tones, space, radius, shadow, motion), typography.ts, fonts.ts
src/components/           Txt, Icon, Button, IconButton, Badge/Count, Tag, Avatar/AvatarStack, Card/ListCard,
                          Field, Input/TextArea, Select, Checkbox/Radio, Switch, Tabs/SegmentedControl,
                          Sheet, Dialog, Toast, Notice, layout helpers (Screen, ScreenHeader, StackHeader…)
src/components/domain/    PostCard, IssueCard/DueLabel, StatusBadge, EscalationTimeline, OrgTree,
                          CommitteeBadge, AudienceLabel, AudienceSummary, NotificationItem, MetricTile, RichText
src/data/mock.ts          Synthetic demo data
src/store/AppStore.tsx    Demo state + toast host (swap for Supabase)
```

## Notes
- Detail screens use query params (`/issue?id=…`, `/manage/case?id=…`) instead of `[id]` folders. If you'd rather use path segments, rename `issue.tsx` → `issue/[id].tsx`, and `main/` → `(tabs)/` to hide it from URLs.
- **Management** is shown only when `ME.isLeader` is set (PRD §7.1). The full desktop admin (Next.js + shadcn/ui) is still a separate web product. The `manage/` screens cover the mobile leadership workflows.
- Colors were converted from the web tokens (oklch → hex) in `src/theme/tokens.ts`. Change them there and keep `../tokens/*.css` in sync.
- All data is fake. Authorization, tenant isolation and push delivery have to be enforced server-side (Supabase RLS + Edge Functions, Expo Push) as the PRD describes. Never trust client-side checks.
