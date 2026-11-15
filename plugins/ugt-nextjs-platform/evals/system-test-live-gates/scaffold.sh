# copy the shared fixture of system-test-no-docker, then this case's extras
# (.env.local with placeholders + a prod basePath, docs/admin-handoff.md) — $0 is the script path
here="$(dirname "${0//\\//}")"
cp -r "$here/../system-test-no-docker/fixture/." .
cp -r "$here/fixture-extra/." .
