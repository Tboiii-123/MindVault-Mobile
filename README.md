# AI Notes: mobile app

React Native (Expo) client for the AI Notes Django backend: capture text or voice, AI names and
summarizes it, search, and share publicly.

## Run it

1. Install [Node 20+](https://nodejs.org) and the **Expo Go** app on your phone.
2. Start the backend (`docker compose up` in the backend folder) so it listens on port 8000.
3. In this folder:

```bash
npm install
cp .env.example .env      # Windows PowerShell: copy .env.example .env
npx expo start
```

4. Scan the QR code with Expo Go (same Wi-Fi as your computer).
   Android emulator: press `a`. iOS simulator (Mac): press `i`.

## Local vs production URL

Everything is in `.env` (restart with `npx expo start -c` after editing):

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_API_URL_LOCAL` | Backend on your computer. Keep `http://localhost:8000`; the app swaps in your computer's LAN IP on a real phone, and `10.0.2.2` on the Android emulator. |
| `EXPO_PUBLIC_API_URL_PROD` | Deployed backend, e.g. `https://api.yourdomain.com` (no trailing slash). |
| `EXPO_PUBLIC_APP_ENV` | `local`, `production`, or empty. Empty = `local` while developing, `production` in release builds. |

The Profile tab shows which server you are on and has a **Test connection** button.

**Phone can't connect?** Windows Firewall must allow inbound port 8000 (allow Docker Desktop when it asks),
and the phone must be on the same Wi-Fi. You can also hard-code your IP: `EXPO_PUBLIC_API_URL_LOCAL=http://192.168.1.20:8000`.

## What works (all MVP endpoints)

| Backend endpoint | Where in the app |
|---|---|
| `auth/register`, `login`, `refresh` (automatic), `logout` | Sign-in / Register screens, silent token refresh in `src/api/client.ts` |
| `auth/me` GET + PATCH | Profile (edit name and role) |
| `auth/password-reset` + `/confirm` | Forgot password screen |
| `capture/` (text + audio) | Home quick-capture bar (creates and AI-names a note) |
| `containers/` list, create | Home list (Active / Archived tabs, pull to refresh, infinite scroll), "+" button |
| `containers/{id}` GET, PATCH, DELETE | Note screen menu: rename, archive, delete; long-press a note on Home |
| `containers/{id}/entries/` GET, POST | Note screen chat timeline (text + voice recording, older pages load as you scroll up) |
| `entries/{id}` GET, PATCH, DELETE | Status polling, edit text/transcript, delete (long-press a bubble) |
| `entries/{id}/retry` | "Retry" button on failed entries |
| `containers/{id}/summary/` | Note menu: AI summary (Today / Yesterday / Week / Month / Everything) |
| `containers/{id}/share/` POST + DELETE | Note menu: share publicly (opens the share sheet) / stop sharing |
| `public/{id}` | Typed in `API.share.getPublic` (the web page `/share/<id>` is what people open) |
| `search/` | Search tab (debounced, highlighted matches) |
| `/health/ready/` | Profile: Test connection |

## Project layout

```
App.tsx                    providers (auth, safe area) + navigation
src/config/env.ts          local / production URL switch
src/api/                   client.ts (fetch + refresh), endpoints.ts (every call), types.ts
src/auth/                  AuthContext + secure token storage
src/navigation/            auth stack, tabs, note screen
src/screens/               Login, Register, Forgot, Home, Container, Search, Profile
src/components/            Composer (text + mic), EntryBubble, VoicePlayer, sheets, UI kit
src/theme/                 colors (light + dark), spacing, shadows
```

## What's next: find every unfinished big feature

Each one is marked in the code with a `TODO(BIG)` comment that says what to build and where:

```bash
grep -rn "TODO(BIG)" src
```

Hand each one to your AI assistant together with the relevant backend code. They cover: offline cache
(TanStack Query), Sentry, social login, deep links for password reset and share links, push
notifications, long-lecture recording and direct-to-S3 upload, live status instead of polling,
Ask My Notes / semantic search, study tools (questions, flashcards), related entries,
collaborators and per-entry sharing, pinned notes and subjects, account deletion and settings,
subscriptions, and a shared audio player with waveforms.

## Building for real users (later)

- Change `ios.bundleIdentifier` and `android.package` in `app.json` (they are placeholders).
- Production must use **https**. Plain `http://` is blocked on release builds; Expo Go is the exception during development.
- `npm i -g eas-cli && eas build` creates installable apps. Voice recording and secure storage work in Expo Go; some later features (share extension, push on iOS) need a dev build.
