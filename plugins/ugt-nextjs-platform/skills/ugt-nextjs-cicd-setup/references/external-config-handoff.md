# External Config Handoff — one table, this project's real names

Everything below is manual work outside the repo: things to create in Jenkins,
SonarQube, and (if SSO is on) Keycloak. The full explanations, screenshots-in-
words, and troubleshooting live in `jenkins-one-time-setup.md`,
`sonarqube-setup.md`, and `ugt-nextjs-auth-setup`'s `references/keycloak-client.md`
— this file exists so the admin doesn't have to cross-reference three documents
to find one project's exact names. **Fill in every `__PLACEHOLDER__` with this
project's real substituted values before handing it over** — same values
already used when copying the Jenkinsfile/sonar-project.properties (§4.2).

Server-level Jenkins setup (plugins, tools, the `NodeJS-22`/`SonarQube-Scanner`/
`Dependency-Check` tool names, the `nvd` credential, global `NOTIFY_EMAIL`/
`SMTP_FROM`) is **done once per Jenkins instance**, not per project — if this
is not the first project on this server, skip straight to the project-level
rows below. Full checklist: `jenkins-one-time-setup.md` §A.

## Project-level handoff table

| # | System | Item | Name/value for **this project** | Notes |
| --- | --- | --- | --- | --- |
| 1 | Jenkins | Credential — prod env | `env-__PROJECT_NAME__` (Secret file) | Upload the prod `.env` contents. Deploy stage `cp`s it to `.env` in the workspace. |
| 2 | Jenkins | Credential — dev env | `env-__PROJECT_NAME__-dev` (Secret file) | Separate `DATABASE_URL` + fresh secrets — never share with prod. |
| 3 | Jenkins | Credential — Sentry DSN | `sentry-dsn-__PROJECT_NAME__` (Secret text) | Only if the project uses Sentry — delete this row otherwise. |
| 4 | Jenkins | Pipeline job | Multibranch Pipeline on `main` + `develop`, **Lightweight checkout disabled** | See `jenkins-one-time-setup.md` §B2. |
| 5 | Jenkins | GitHub webhook | `http://<jenkins-host>:8080/github-webhook/`, event: push only | See §B3. |
| 6 | Jenkins | Reverse proxy (dev) | `location __BASE_PATH_DEV__ { proxy_pass http://127.0.0.1:__PORT_DEV__; ... }` | Only if a basePath is used. Full nginx block: §B4. `__PORT_DEV__` here is only a proposed default (`3000`/`3001`) — if the port assigned in row 7 differs, use that instead. |
| 7 | Jenkins | **→ Return to dev team:** `APP_PORT` (prod + dev) | Host ports actually assigned for this project's containers | **Required — dev team is holding `3000`/`3001` as a placeholder until this comes back.** Feeds `APP_PORT` in `.env`/`.env.dev` (§4.2) and the reverse-proxy block above (row 6). |
| 8 | SonarQube | Project — prod | Key `__PROJECT_NAME__`, name `__PROJECT_DISPLAY_NAME__` | |
| 9 | SonarQube | Project — dev | Key `__PROJECT_NAME__-dev`, name `__PROJECT_DISPLAY_NAME__ (Dev)` | |
| 10 | SonarQube | Quality Gate | Org-standard gate (§2.3 of `ugt-nextjs-cicd-setup`) assigned to **both** projects above | |
| 11 | SonarQube | Webhook → Jenkins | `http://<jenkins-host>:8080/sonarqube-webhook/` | Without this, `waitForQualityGate` hangs forever. |
| 12 | Keycloak [SSO only] | Client | Client ID `__PROJECT_NAME__`, confidential, PKCE S256, redirect URI `__APP_URL_PROD__/api/auth/oauth2/callback/keycloak` (+ the dev URL) | Delete this row and #13 if SSO is not selected. |
| 13 | Keycloak [SSO only] | Env vars to collect | `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID=__PROJECT_NAME__`, `KEYCLOAK_CLIENT_SECRET` | Verify the issuer via `<issuer>/.well-known/openid-configuration`. |

## After filling it in

- [ ] Every `__PLACEHOLDER__` above replaced with the real value (grep the
      rendered file for `__` to catch anything missed)
- [ ] Rows for unselected modules (Sentry, SSO) deleted, not left blank
- [ ] Row 7 (`APP_PORT`) flagged clearly as a value the admin must send back, not just fill in
- [ ] Handed to whoever holds Jenkins/SonarQube/Keycloak admin access — this
      skill cannot create any of these itself, all four systems are external
