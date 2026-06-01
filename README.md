# The Vault

The Vault is an offline-first mobile point-of-sale and business operations app built with Expo, React Native, Supabase, and PowerSync. It is designed for retail or multi-branch teams that need to manage authentication, business membership, inventory, sales, receipts, analytics, and settings from a single app.

## Overview

The app supports two primary roles:

- `owner` - manages businesses, branches, employees, reports, and higher-level analytics.
- `employee` - handles inventory, sales, checkout, and operational tasks within an assigned business.

The application bootstraps session state on launch, restores local auth from secure storage, and uses PowerSync to keep a local database available even when connectivity is limited. When remote sync configuration is present, the app connects to Supabase and PowerSync for authenticated sync across devices.

## Key Features

- Email/password authentication
- Role-based navigation for owners and employees
- Business selection and branch context
- Inventory browsing, adding, editing, and restocking
- Sales workflow with cart, checkout, and receipt screens
- Analytics and transaction detail views
- Settings screens for business administration, reports, audit logs, and branch management
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
  types/               Shared TypeScript types and navigation contracts
  utils/               Formatting, validation, and helper utilities
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
| `EXPO_PUBLIC_SUPABASE_URL` | Yes for remote auth/sync | Supabase project URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes for remote auth/sync | Supabase anonymous API key. |
| `EXPO_PUBLIC_POWERSYNC_URL` | Yes for remote sync | PowerSync service URL. |
| `EXPO_PUBLIC_POWERSYNC_SCHEMA` | No | PowerSync schema name. Defaults to `public`. |

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

## Runtime Notes

- The app uses Hermes, portrait orientation, and the `thevault` URL scheme.
- Authentication sessions are persisted using Expo Secure Store.
- PowerSync is initialized on app launch and after session hydration.
- Role-based routing determines whether the user sees the owner or employee workspace.

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

This structure supports both operational workflows and historical reporting while keeping the local client database aligned with the remote backend when sync is available.

## Troubleshooting

- If the app opens to the splash screen and never advances, verify that the auth session can be restored from secure storage.
- If login fails with a Supabase error, confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set correctly.
- If sync is unavailable, verify `EXPO_PUBLIC_POWERSYNC_URL` and the remote schema setup.
- If native modules fail to build, ensure you are using a development build or a native runtime that includes the required Expo and PowerSync dependencies.

## Contributing

- Keep feature code grouped by domain under `src/features`.
- Prefer shared UI primitives from `src/components/ui` before creating new one-off controls.
- Update TypeScript types and PowerSync schema together when changing persisted data.
- Run `npm run typecheck` and `npm run lint` before opening a pull request.

## License

No license file is currently included in this repository. Add one if you intend to distribute the project publicly.
