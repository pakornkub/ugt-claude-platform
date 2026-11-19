---
type: tool_used
tool: Write
input_match: '"file_path":\s*"[^"]*mail-templates(?:/|\\\\)loading\.tsx"'
min: 1
---
/admin/mail-templates ships a loading.tsx (4.97.0). Matched on the Write, not a fixed path: this fixture merged the admin pages into (app), so the route lives wherever page.tsx went.
