# Third-Party Software Notices and Licenses

This project incorporates third-party open-source software packages under their respective licenses, in compliance with PRD §15.3 and Acceptance Criterion #26.

---

## 1. Expo & React Native Core
- **React Native** (`facebook/react-native`)
  - License: MIT License
  - Copyright (c) Meta Platforms, Inc. and affiliates.
- **Expo SDK & Expo Router** (`expo/expo`)
  - License: MIT License
  - Copyright (c) 650 Industries, Inc. (Expo)

---

## 2. Supabase Client
- **@supabase/supabase-js**
  - License: MIT License
  - Copyright (c) 2020 Supabase Inc.

---

## 3. UI, Icons & Typography
- **Lucide Icons** (`lucide-react-native`, `lucide-static`)
  - License: ISC License
  - Copyright (c) Lucide Contributors (adapted from Feather by Cole Bemis)
  - Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.
- **Google Fonts (Source Serif 4, Public Sans, IBM Plex Mono)**
  - **Source Serif 4:** SIL Open Font License, Version 1.1 (Copyright Frank Grießhammer)
  - **Public Sans:** SIL Open Font License, Version 1.1 (United States Web Design System)
  - **IBM Plex Mono:** SIL Open Font License, Version 1.1 (Copyright (c) 2017 IBM Corp.)

---

## 4. Dependencies & Libraries
- **react-native-safe-area-context**: MIT License (Copyright (c) 2019 Th3rd Wave)
- **react-native-screens**: MIT License (Copyright (c) 2018 Software Mansion)
- **react-native-svg**: MIT License (Copyright (c) 2015-2016 Horcrux)
- **query-string**: MIT License (Copyright (c) Sindre Sorhus)

---

## 5. Added in the security & PRD-compliance update
- **@react-native-async-storage/async-storage** (session persistence): MIT License (Copyright (c) 2015-present, Facebook, Inc.)
- **expo-notifications**, **expo-device**, **expo-document-picker** (push, device detection, evidence upload): MIT License (Copyright (c) 650 Industries, Inc.)
- **@electric-sql/pglite** (development/test only — runs PostgreSQL in tests; not shipped in the app): Apache License 2.0 (Copyright (c) ElectricSQL) — the PostgreSQL portions are under the PostgreSQL License.
- **Supabase Edge Runtime / Deno** (server-side `dispatch-push` function, not shipped in the app): MIT License.

No source code was copied from the candidate repositories listed in PRD §15.3 (ciaorelated, xMind, Ahlan Social Mobile, CivicFix, etc.).

