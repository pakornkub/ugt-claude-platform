# reuse module-auth-after-design's fixture (db + test-lint + design installed) — $0 is the script path (Windows or POSIX form)
here="$(dirname "${0//\\//}")"
cp -r "$here/../module-auth-after-design/fixture/." .
