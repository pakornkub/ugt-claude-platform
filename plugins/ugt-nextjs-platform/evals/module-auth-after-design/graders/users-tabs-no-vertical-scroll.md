---
type: tool_used
tool: Write
input_match: '"file_path":\s*"[^"]*admin(?:/|\\\\)users(?:/|\\\\)page\.tsx"[\s\S]*className=\\"[^"\\]*\boverflow-y-hidden\b[^"\\]*\\"[^>]*>(?:\\n|\s)*<TabsList\b'
min: 1
---
The scroll wrapper around the /admin/users TabsList sets overflow-y-hidden. overflow-x-auto alone computes overflow-y to auto, and a strip 1px taller than its box grows a vertical scrollbar with arrows (user report, 4.98.0). Matched on the Write (content is JSON-escaped there: quotes are \" and newlines the two characters \n) because §5.6 may nest (admin) under the shell group.
