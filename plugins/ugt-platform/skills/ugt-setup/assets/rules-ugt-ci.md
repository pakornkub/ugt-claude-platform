---
paths:
  - "Jenkinsfile"
  - "Dockerfile"
  - "docker-compose*.yml"
  - "sonar-project.properties"
  - "owasp-suppressions.xml"
  - "next.config.*"
---

<!-- ไฟล์นี้ ugt-cicd-setup เป็นเจ้าของ — เขียนทับได้ทั้งไฟล์ตอน /plugin update -->

# กฎ CI/CD (โหลดเมื่อแตะ Jenkinsfile / Docker / Sonar config)

## Stage list คือ contract — เปลี่ยนได้แค่คำสั่งข้างใน ห้ามตัด stage

```
Checkout → Install → Code Quality (parallel: lint / format:check / typecheck)
  → Unit Tests (JUnit + coverage) → Build
  → OWASP Dependency Check (timeout 90 นาที + suppression file)
  → SonarQube Analysis → Quality Gate (abortPipeline: true)
  → Docker Build → Deploy        ← 2 stage สุดท้ายเฉพาะ main/develop
post: emailext (success/unstable/failure/aborted) + cleanWs
```

## Quality Gate (วัดบน new code)

| Condition | Threshold |
| --- | --- |
| `new_violations` | = 0 |
| `new_duplicated_lines_density` | ≤ 3% |
| `new_coverage` | ≥ 60% |
| `new_security_hotspots_reviewed` | = 100% |

`waitForQualityGate abortPipeline: true` + timeout เสมอ — ไม่มี `abortPipeline` แล้ว gate แดง
แต่ pipeline เขียวต่อ ซึ่งแย่กว่าไม่มี gate เลยเพราะให้ความมั่นใจผิด

## Secrets

- secret ใน `sh` ต้องให้ **shell** expand: `"$VAR"` — **ห้าม** Groovy interpolation `"${VAR}"`
  เพราะค่ารั่วลง build log (ระวังเป็นพิเศษใน `sh """..."""` ที่ Groovy interpolate ทุก `${}`)
- ไฟล์ชั่วคราวที่มี secret ลบใน `post { always }`
- `NOTIFY_EMAIL` / `SMTP_FROM` เป็น Jenkins Global env — ห้าม hardcode
- credential ตั้งชื่อตามแบบ: `nvd` · `env-<project>` · `env-<project>-dev` · `sentry-dsn-<project>`

## Branch / per-branch values

`main` = prod · `develop` = dev (ทุกอย่างต่อ `-dev`)

ค่าที่ต่างตาม branch **ต้อง** resolve ใน `script {}` จาก
`env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last()` — ห้ามใส่ค่า branch-specific
ใน global `environment {}`

## Docker

- `NEXT_PUBLIC_*` ถูก inline เข้า bundle ตอน compile → ต้องส่งเป็น **`--build-arg`**
  ใส่ใน compose `environment:` ไม่มีผลเลย
- deploy ด้วย `--no-build` (ใช้ image จาก stage Docker Build) — ให้ compose rebuild แล้ว build-arg หาย
- tag image ด้วย `BUILD_NUMBER` ไม่ใช้ `latest` เดี่ยว ๆ (rollback ไม่ได้)
- healthcheck ยิง `127.0.0.1` ไม่ใช่ `localhost` (Alpine resolve เป็น IPv6 แล้ว fail)
- `pull_policy: never` ใน compose — image build ในเครื่อง ไม่มีใน registry
- **migrate ก่อน `compose up` เสมอ** — migrate fail = ไม่ deploy
- `next.config` ต้องเปิด `output: 'standalone'` ไม่งั้น Dockerfile `COPY .next/standalone` fail

## SonarQube config

- ทุก path ใน `sonar.sources` / `sonar.tests` **ต้องมีอยู่จริง** — ไม่มีจริง sonar-scanner fail ทันที
- `sonar.javascript.lcov.reportPaths=coverage/lcov.info` — ไม่มีไฟล์นี้ `new_coverage` จะเป็น 0%
  แล้ว gate block โดยไม่มี error ที่ชี้ต้นเหตุ
- ทุก entry ใน `sonar.cpd.exclusions` / `sonar.issue.ignore.multicriteria` และทุก
  `<suppress>` ใน `owasp-suppressions.xml` ต้องมี **comment/`<notes>` อธิบายเหตุผล**
  และเพิ่มได้เฉพาะหลังเห็น finding จริงแล้วตัดสินว่า intentional — ห้าม suppress ล่วงหน้า

## CI env

`CI=true` + `SKIP_ENV_VALIDATION=1` — **`SKIP_ENV_VALIDATION` ใช้เฉพาะตอน build/CI
ห้ามตั้งใน production container** (จะข้าม validation ของ env จริงตอน runtime)
