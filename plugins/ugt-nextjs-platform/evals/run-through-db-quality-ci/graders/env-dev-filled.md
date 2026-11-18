---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*NEXT_PUBLIC_BASE_PATH="?/leave-request-dev"?(\r?\n|$))(?=[\s\S]*NEXT_PUBLIC_APP_NAME="?ระบบคำขอลา \(DEV\)"?(\r?\n|$))(?=[\s\S]*NEXT_PUBLIC_APP_URL="?https://apps\.ugt\.local/leave-request-dev"?(\r?\n|$))'
target: { source: file, path: .env.dev }
---
.env.dev carries the dev values (env-files.md): basePath /leave-request-dev, display name + " (DEV)", dev URL.
