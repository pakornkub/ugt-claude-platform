# base = module-mail-after-auth's project (db + test-lint + design + auth + cicd,
# no mail) — Next.js 15 with middleware.ts, so the body-limit key under test is
# middlewareClientMaxBodySize. $0 is the script path (Windows or POSIX form).
here="$(dirname "${0//\//}")"
cp -r "$here/../module-auth-after-design/fixture/." .
cp -r "$here/../module-mail-after-auth/fixture/." .
