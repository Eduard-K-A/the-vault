# The Vault

The Vault is an offline-first mobile point-of-sale and business operations app built with Expo, React Native, Supabase, and PowerSync. It is designed for retail or multi-branch teams that need to manage authentication, business membership, inventory, sales, receipts, analytics, and settings from a single app.

## Overview

The app supports two primary roles:

- `owner` - manages businesses, branches, employees, reports, and higher-level analytics.
- `employee` - handles inventory, sales, checkout, and operational tasks within an assigned business.

The application bootstraps session state on launch, restores local auth from secure storage, and uses PowerSync to keep a local database available even when connectivity is limited. Owner businesses are hydrated directly from Supabase during session restore so the business picker is immediately populated after sign-in. When remote sync configuration is present, the app connects to Supabase and PowerSync for authenticated sync across devices.

## Key Features

- Email/password authentication
- Role-based navigation for owners and employees
- Business selection and branch context
- Inventory browsing, adding, editing, and restocking
- Sales workflow with cart, checkout, and receipt screens
- Analytics and transaction detail views
- Offline checkout with queued sale, payment, inventory, and audit uploads
- Manual sync controls and sync diagnostics
- App error boundary and sanitized observability hooks
- Settings screens for business administration, reports, audit logs, and business deletion
- Local persistence and offline-first data access
- Secure session storage

## System Architecture

### Frontend

- Built with Expo and React Native
- Navigation is handled by React Navigation using a root stack plus role-specific tab navigators
- UI state is managed with Zustand stores
- Shared UI primitives live under `src/components/ui`

### Authentication Flow

1. The app starts in `App.tsx`.
2. `hydrateSession()` restores the last authenticated session from secure storage.
3. If a session exists, the app sets Supabase auth state, loads business summaries, and connects PowerSync.
4. If no session exists, the user is routed to the landing, login, or signup screens.

### Data Layer

- Supabase provides authentication and remote backend access.
- PowerSync provides the local database and sync layer.
- Expo Secure Store is used to persist the current session securely on device.
- The local schema is defined in `src/powersync/schema.ts`.

### State Management

- `src/store/authStore.ts` stores auth status, identity, and role.
- `src/store/businessStore.ts` stores the active business, active branch, and available business memberships.
- Additional feature-specific state is handled in dedicated hooks and stores under `src/hooks` and `src/store`.

### Offline and Sync

- `src/config/offline.ts` reads runtime configuration from environment variables.
- `src/services/offline.service.ts` and `src/services/powersync.service.ts` coordinate the local runtime and sync connection.
- Manual sync reports the current phase in logs so timeout failures identify whether sync stopped while connecting, draining uploads, or waiting for pull confirmation.
- Offline checkout writes sale, sale item, payment, inventory, and audit rows locally first. PowerSync later uploads the bundled transaction through Supabase Edge Functions.
- Sync diagnostics are available from Settings so testers can inspect connectivity, pending uploads, failed uploads, last sync time, and retry sync manually.
- When the remote sync configuration is missing, the app can still boot locally, but remote sync features will not be fully available.

## Project Structure

```text
App.tsx
src/
  app/                Navigation entry and route composition
  components/         Shared UI and reusable components
  config/              Runtime configuration and environment helpers
  constants/           Theme, spacing, sizing, and typography tokens
  db/                  PowerSync database helpers and queries
  features/            Feature screens grouped by domain
  hooks/               Shared React hooks
  powersync/           PowerSync schema, system, and connector setup
  services/            Application services for auth, business, sync, export, and remote APIs
  store/               Zustand state stores
  testing/             Load fixture helpers for stress and beta test data
  types/               Shared TypeScript types and navigation contracts
  utils/               Formatting, validation, and helper utilities
supabase/
  functions/           Edge Functions used by PowerSync uploads
  migrations/          Supabase schema and RLS migrations
test/                  Node, Jest, component, integration, and static contract tests
```

## Main Screens

- Auth
  - Landing
  - Login
  - Signup
  - Forgot Password
  - Splash
- Business
  - Business Selection
  - Join Business
  - Create Business
  - Business Created
- Operations
  - Inventory
  - Sales
  - Checkout
  - Receipt
  - Analytics
  - Employee Performance Dashboard
  - Transaction Detail
- Administration
  - Settings
  - Owner Settings
  - Branch Management
  - Reports
  - Audit Log
  - Sync Diagnostics
  - Employee List
  - Employee Detail
  - Restock

## Requirements

- Node.js 18 or later
- npm
- Expo CLI via the project scripts
- iOS Simulator, Android Emulator, or a physical device
- Supabase project
- PowerSync backend and schema configured for this app

## Environment Variables

Create a local `.env` file or set environment variables before starting the app.

| Variable | Required | Description |
| --- | --- | --- |
| `EXPO_PUBLIC_APP_ENV` | No | App environment label. Defaults to `development`. |
| `EXPO_PUBLIC_APP_VERSION` | No | App version label used in observability metadata. |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes for remote auth/sync | Supabase project URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes for remote auth/sync | Supabase anonymous API key. |
| `EXPO_PUBLIC_POWERSYNC_URL` | Yes for remote sync | PowerSync service URL. |
| `EXPO_PUBLIC_POWERSYNC_SCHEMA` | No | PowerSync schema name. Defaults to `public`. |
| `EXPO_PUBLIC_SENTRY_DSN` | No | Optional remote observability DSN. The app still uses sanitized local logging without it. |

If the Supabase and PowerSync variables are missing, the app can still start, but remote authentication and sync features will not work as intended.

## Installation

```bash
npm install
```

## Running the App

### Start the development server

```bash
npm start
```

### Run on Android

```bash
npm run android
```

This installs a development build and usually requires Metro to stay running while testing.

### Build an Android APK with EAS

Use this path for unplugged device testing. The preview APK bundles the JavaScript into the app and does not require USB, Metro, or your laptop after installation.

```bash
npx --yes eas-cli login
npx --yes eas-cli build --profile preview --platform android
```

When the build finishes, open the EAS link or scan the QR code on the Android device and install the APK. If Android blocks the install, allow APK installs from the browser or Files app in Android settings.

Before installing a new beta build, uninstall the older development build or clear app data if you need a clean local database:

```bash
adb shell pm clear com.anonymous.thevault
```

### Run on iOS

```bash
npm run ios
```

### Run on Web

```bash
npm run web
```

## Validation and Quality Checks

### Type checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Unit, component, and integration tests

```bash
npm run test
npm run test:jest
```

### Full local verification

```bash
npm run verify
```

`npm run verify` runs Node tests, Jest tests, TypeScript type checking, ESLint, and React/React Native dependency alignment checks.

### Maestro offline checkout flow

The Maestro flow is intended for an installed Android app with seeded test data and a signed-in session.

```bash
npm run test:e2e:offline-checkout
```

The flow toggles airplane mode, completes checkout offline, restores connectivity, and confirms the app returns to the POS workspace.

## Supabase Deployment

Remote database and Edge Function changes are not applied by running the mobile app. Deploy backend changes before beta testing sync.

### Push migrations

```bash
npx supabase db push
```

This applies schema and RLS migrations, including POS sync lifecycle fields, payment lifecycle fields, branch-scoped policies, and inventory log hardening.

### Deploy Edge Functions

```bash
npx supabase functions deploy commit_sale
npx supabase functions deploy create_refund
npx supabase functions deploy apply_inventory_adjustment
```

The mobile app uses these functions during PowerSync upload. If a function is missing or stale, checkout may work locally but uploads will fail or remain pending.

## Runtime Notes

- The app uses Hermes, portrait orientation, and the `thevault` URL scheme.
- Authentication sessions are persisted using Expo Secure Store.
- PowerSync is initialized on app launch and after session hydration.
- Role-based routing determines whether the user sees the owner or employee workspace.
- Owner-facing destructive actions use typed confirmation and operate on the current business, not just the active branch.
- Do not update synced PowerSync rows from inside `uploadData()` after a successful upload. That creates new local PATCH operations and can cause an infinite upload loop.

## Database and Sync Model

The PowerSync schema includes tables for:

- Profiles
- Businesses
- Branches
- Business members
- Categories
- Products
- Inventory items and logs
- Sales and sale items
- Payments
- Refunds and refund items
- Audit logs
- Device sessions

Sales include sync lifecycle and idempotency fields. Payments track payment lifecycle separately from sale status. Inventory logs are scoped by business and branch for auditability.

Business and product deletes are cascaded through Supabase, while the local PowerSync client also clears dependent rows to keep the offline store aligned after destructive actions.

This structure supports both operational workflows and historical reporting while keeping the local client database aligned with the remote backend when sync is available.

## Troubleshooting

- If the app opens to the splash screen and never advances, verify that the auth session can be restored from secure storage.
- If login fails with a Supabase error, confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set correctly.
- If sync is unavailable, verify `EXPO_PUBLIC_POWERSYNC_URL` and the remote schema setup.
- If manual sync fails, check the phase-specific log line to see whether it stopped while connecting, draining uploads, or waiting for first sync.
- If sync stays in an infinite upload loop, check whether local code is writing to synced tables inside PowerSync `uploadData()`. Successful upload handlers must not create new local CRUD entries for the same row.
- If Android startup fails with `Cannot add a column to a view`, rebuild with the local schema compatibility fix and clear old app data before retesting.
- If an EAS build says the experience/project id does not exist, remove stale placeholder `extra.eas.projectId` values from `app.json` and rerun the EAS build so Expo can create or link the real project.
- If a product edit appears stuck after login, re-run manual sync after the `save_product` function is deployed to the project.
- If native modules fail to build, ensure you are using a development build or a native runtime that includes the required Expo and PowerSync dependencies.

## Contributing

- Keep feature code grouped by domain under `src/features`.
- Prefer shared UI primitives from `src/components/ui` before creating new one-off controls.
- Update TypeScript types and PowerSync schema together when changing persisted data.
- Run `npm run verify` before opening a pull request.
- Keep Supabase migrations and Edge Functions aligned with PowerSync upload payloads.

## License

This repository is licensed under the MIT License. See [LICENSE](./LICENSE) for the full text.
