---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*NEXT_PUBLIC_BASE_PATH="?/leave-request"?(\r?\n|$))(?=[\s\S]*NEXT_PUBLIC_APP_NAME="?ระบบคำขอลา"?(\r?\n|$))(?=[\s\S]*NEXT_PUBLIC_APP_URL="?https://apps\.ugt\.local/leave-request"?(\r?\n|$))'
target: { source: file, path: .env }
---
.env carries the prod values from the interview (env-files.md): basePath /leave-request, plain display name, prod URL — not the .env.local copy left at localhost/dev values.
