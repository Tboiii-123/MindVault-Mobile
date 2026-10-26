# AI Notes mobile app (Expo + React Native + TypeScript)

Client for the Django backend in the `ainotes` project (REST under `/api/v1`, JWT auth).

- Navigation: **React Navigation** (native-stack + bottom-tabs), see `src/navigation/`. Not Expo Router.
- All HTTP goes through `src/api/client.ts` (token refresh, error envelope). Endpoints are typed in `src/api/endpoints.ts`.
- Backend URL comes from `.env` (`EXPO_PUBLIC_*`), resolved in `src/config/env.ts`.
- Install Expo packages with `npx expo install <pkg>` (use `npm i pkg@<version>` if that command is blocked by a proxy).
- Check your work: `npx tsc --noEmit`.
- Unfinished big features are marked in code with `TODO(BIG): ...` (each says what to build and where).
  List them: `grep -rn "TODO(BIG)" src`
- Expo APIs change every SDK. For anything Expo-specific, read the docs for the installed SDK version first.
