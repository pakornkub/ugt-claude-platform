---
type: tool_used
tool: Write
input_match: '"file_path":\s*"[^"]*admin(?:/|\\\\)roles(?:/|\\\\)loading\.tsx"[\s\S]*export default function Loading\b'
min: 1
---
Every route ships a loading.tsx (DESIGN.md §6); /admin/roles gets the kit's one (4.97.0). Matched on the Write, not a fixed path: §5.6 lets the run nest (admin) under the project's shell group (the 4.98.0 run wrote app/(app)/(admin)/…).
