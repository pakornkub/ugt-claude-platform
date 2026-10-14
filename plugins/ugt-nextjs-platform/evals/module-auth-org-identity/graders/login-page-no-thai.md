---
type: regex
pattern: '^(?!\s*(//|\*|/\*))(?!.*\bmetadata\b)[^\n]*[\u0E00-\u0E7F]'
flags: m
match: not_contains
target: { source: file, path: app/(auth)/login/page.tsx }
---
Hero copy comes from the project catalog (getTranslations('app.loginHero')), not Thai literals in the page. Comment lines and the `metadata` title are exempt — the fixture's own pages use a Thai literal metadata title.
