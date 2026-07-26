# SonarQube Setup (one-time ต่อ environment) + Suppression Strategy

## A. สร้าง Project (แยก prod/dev)

แต่ละ branch มี SonarQube project ของตัวเองเพื่อแยก metrics:

SonarQube → Projects → Create Project → Manually:

| Branch    | Project key            | Display name                    |
| --------- | ---------------------- | ------------------------------- |
| `main`    | `__PROJECT_NAME__`     | `__PROJECT_DISPLAY_NAME__`      |
| `develop` | `__PROJECT_NAME__-dev` | `__PROJECT_DISPLAY_NAME__ (Dev)` |

ค่าใน `sonar-project.properties` เป็นแค่ default — Jenkinsfile override ตอน scan:

```groovy
withSonarQubeEnv('SonarQube') {
  sh "${tool('SonarQube-Scanner')}/bin/sonar-scanner \
      -Dsonar.projectKey=${sonarKey} -Dsonar.projectName='${sonarName}'"
}
```

## B. Tokens — ประเภทสำคัญ

| ใช้กับ                              | ประเภท token               | เก็บที่                                        |
| ----------------------------------- | -------------------------- | ---------------------------------------------- |
| Jenkins scanner (`withSonarQubeEnv`) | **Global Analysis Token**  | Jenkins Secret Text credential → ผูกใน Manage Jenkins → System → SonarQube servers |
| MCP server / SonarLint / API ส่วนตัว | **USER token** เท่านั้น    | เครื่อง dev (นอก Git)                          |

สร้างที่: My Account → Security → Generate Token

## C. Quality Gate — org standard thresholds

Quality Gates → Create (หรือใช้ gate กลางขององค์กร) → Conditions **on New Code**:

| Condition                        | Threshold | หมายเหตุ                          |
| -------------------------------- | --------- | --------------------------------- |
| `new_coverage`                   | ≥ 60%     | coverage ของโค้ดใหม่              |
| `new_violations`                 | = 0       | issue ใหม่ทุก severity ต้องเป็นศูนย์ |
| `new_duplicated_lines_density`   | ≤ 3%      | duplication ในโค้ดใหม่            |
| `new_security_hotspots_reviewed` | = 100%    | hotspot ทุกตัวต้องถูก review      |

Assign gate ให้ **ทั้ง** project prod และ dev

Pipeline block ที่ `waitForQualityGate abortPipeline: true` — gate ไม่ผ่าน =
build abort ไม่มีข้อยกเว้น

## D. Webhook → Jenkins (จำเป็น ไม่งั้น waitForQualityGate ค้าง)

Administration → Webhooks → Create:

- Name: `Jenkins`
- URL: `http://<jenkins-host>:8080/sonarqube-webhook/`

## E. Suppression Strategy — 3 ชั้น เลือกให้ถูก

| กลไก                                | ผล                                        | ใช้เมื่อ                                                                  |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `sonar.exclusions`                  | ไฟล์ไม่ถูก analyze เลย                    | generated code, build output, migrations, config, test scaffolding — **ห้ามใช้กับ production logic** |
| `sonar.cpd.exclusions`              | ยัง scan bug/smell แต่ไม่ scan duplication | production code ที่ตั้งใจมีโครงซ้ำ (parallel components ต่างกันแค่ generic type) |
| `sonar.issue.ignore.multicriteria`  | ปิด rule เฉพาะ scope ไฟล์                 | false positive ของ library pattern (เช่น TanStack inline cell renderers)  |

**กติกาเหล็ก:** ทุก entry ใน `cpd.exclusions` และ `multicriteria` ต้องมี
**comment เหตุผล** กำกับในไฟล์ — เพิ่มได้เฉพาะหลัง review finding จริงแล้ว
ตัดสินว่า intentional/false positive ไม่ใช่เพิ่มกันไว้ล่วงหน้า

### ป้องกัน duplication ตั้งแต่เขียน (ดีกว่า suppress)

SonarQube จับ block ซ้ำ 10+ บรรทัดข้ามไฟล์ — ถ้ากำลัง copy component แล้วเปลี่ยน
แค่ type/label ให้หยุดแล้ว extract generic ก่อน:

```tsx
// ✅ one generic component + thin typed wrappers
function EntityTab<TRow extends BaseRow>({ fetchFn, deleteAction, ... }) { ... }
function FooTab() { return <EntityTab<FooRow> fetchFn={fetchFoo} ... />; }

// ❌ two 100+ line components ต่างกันแค่ type names
```

> แนวเขียนโค้ดให้ผ่าน gate ตั้งแต่ scan แรก (modern-JS idioms, `Readonly<>`
> props, NOSONAR placement) → skill **`ugt-clean-code`** — คนละหน้าที่กับ skill นี้

## F. OWASP DC plugin integration

- ติดตั้ง plugin **Dependency-Check** ใน SonarQube (Marketplace)
- Plugin v6+ (SonarQube 2025.x) อ่าน **JSON report เท่านั้น** — Jenkinsfile
  ต้องมี `--format JSON` และ properties ต้องชี้:

```properties
sonar.dependencyCheck.jsonReportPath=dc-report/dependency-check-report.json
sonar.dependencyCheck.htmlReportPath=dc-report/dependency-check-report.html
# threshold เป็นคะแนน CVSS (0–10) ไม่ใช่ชื่อ severity
sonar.dependencyCheck.severity.high=7.0
sonar.dependencyCheck.severity.medium=4.0
sonar.dependencyCheck.severity.low=0.0
```

## G. Coverage property

`sonar.javascript.lcov.reportPaths=coverage/lcov.info` — ไฟล์นี้มาจาก
`npm run test:coverage` ซึ่ง `ugt-quality-setup` ตั้ง reporter `lcov` ไว้ให้แล้ว
ถ้า path นี้ไม่มีไฟล์จริง Sonar จะรายงาน `new_coverage` เป็น 0% แล้ว Quality Gate
block ทุก build โดยไม่มี error ที่ชี้ต้นเหตุ
