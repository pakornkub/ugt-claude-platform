---
type: llm
focus: { source: file, path: lib/actions/leave-requests.ts }
---
PASS only if createLeaveRequestAction: (1) creates the row first and sends mail only after that write has completed (not inside a transaction); (2) wraps the send in try/catch (or .catch) that logs the error and still returns success — a mail failure never turns the action into a failure or throws; (3) calls sendTemplatedMail (not sendMail / a new nodemailer transport) with to = hr-leave@ube.co.th (literal or from an env/config value); (4) passes `actor` with the session user's email and hasDevMode from the dev-mode:enable permission; (5) any link in the vars is a full URL built from an env value (e.g. NEXT_PUBLIC_APP_URL / BETTER_AUTH_URL), not a relative path.
