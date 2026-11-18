---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*NEXT_PUBLIC_BASE_PATH="?/leave-request-dev"?(\r?\n|$))(?=[\s\S]*NEXT_PUBLIC_APP_NAME="?ระบบคำขอลา \(DEV\)"?(\r?\n|$))(?=[\s\S]*NEXT_PUBLIC_APP_URL="?http://localhost:3000/leave-request-dev"?(\r?\n|$))'
target: { source: file, path: .env.local }
---
.env.local is filled for local dev (env-files.md): dev basePath, " (DEV)" name, http://localhost:3000/leave-request-dev — not the example's empty basePath / bare localhost.
