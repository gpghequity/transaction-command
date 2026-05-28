# Transaction Command

AI-Powered Transaction Compliance demo, built by Projects with a Purpose LLC.

Four-page Express app: Login → Dashboard → Document Check → About.
Simulated backend — real Claude integration drops in later without rebuilding.

## Run locally

```
npm install
node index.js
```

Visit `http://localhost:3003`.

Login: `tccommand` / `gorilla2026`.

## Routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `/login` | public | Credentials gate |
| `/dashboard` (or `/`) | required | 4 stat cards + transaction table + New Transaction modal |
| `/document-check` | required | Upload PDF + run simulated compliance report |
| `/about` | public | Feature marketing + Request Access CTA |

## Version + deploy timestamp

Defined as constants at the top of `index.js`:

```js
const APP_VERSION = 'v1.0';
const LAST_DEPLOY = 'April 16, 2026 10:27 PM EST';
```

Per brief, both must be updated **before** every Railway push:
- Bump `APP_VERSION` by 0.1 (v1.0 → v1.1 → v1.2 ...)
- Set `LAST_DEPLOY` to the current timestamp

They inject into every page via `res.locals.version` / `res.locals.lastUpdated` and render in the footer.
