# base = module-auth-after-design's fixture (db + test-lint + design), then this
# case's fixture/ on top: auth (SSO + LDAP + Local, HR view, ORG_EMAIL_DOMAINS,
# no mail) as module-auth-org-identity installs it, cicd compose files, and a
# leave-request create action. $0 is the script path (Windows or POSIX form).
here="$(dirname "${0//\\//}")"
cp -r "$here/../module-auth-after-design/fixture/." .
cp -r "$here/fixture/." .
