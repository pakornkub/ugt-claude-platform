# SonarQube Setup (one-time per environment) + Suppression Strategy

## A. Create the projects (prod/dev split)

Each branch gets its own SonarQube project so the metrics stay separate:

SonarQube → Projects → Create Project → Manually:

| Branch | Project key | Display name |
| --- | --- | --- |
| `main` | `__PROJECT_NAME__` | `__PROJECT_DISPLAY_NAME__` |
| `develop` | `__PROJECT_NAME__-dev` | `__PROJECT_DISPLAY_NAME__ (Dev)` |

Values in `sonar-project.properties` are only defaults — the Jenkinsfile
overrides them at scan time:

```groovy
withSonarQubeEnv('SonarQube') {
  sh "${tool('SonarQube-Scanner')}/bin/sonar-scanner \
      -Dsonar.projectKey=${sonarKey} -Dsonar.projectName='${sonarName}'"
}
```

## B. Tokens — the types matter

| Used by | Token type | Stored where |
| --- | --- | --- |
| Jenkins scanner (`withSonarQubeEnv`) | **Global Analysis Token** | Jenkins Secret Text credential → bound in Manage Jenkins → System → SonarQube servers |
| MCP server / SonarLint / personal API | **USER token** only | the dev machine (outside Git) |

Create at: My Account → Security → Generate Token

## C. Quality Gate — org-standard thresholds

Quality Gates → Create (or use the org's central gate) → Conditions **on New Code**:

| Condition | Threshold | Notes |
| --- | --- | --- |
| `new_coverage` | ≥ 60% | coverage of new code |
| `new_violations` | = 0 | new issues of every severity must be zero |
| `new_duplicated_lines_density` | ≤ 3% | duplication in new code |
| `new_security_hotspots_reviewed` | = 100% | every hotspot must be reviewed |

Assign the gate to **both** the prod and dev projects.

The pipeline blocks at `waitForQualityGate abortPipeline: true` — gate fails =
build aborts, no exceptions.

## D. Webhook → Jenkins (required — without it waitForQualityGate hangs)

Administration → Webhooks → Create:

- Name: `Jenkins`
- URL: `http://<jenkins-host>:8080/sonarqube-webhook/`

## E. Suppression strategy — 3 layers, pick correctly

| Mechanism | Effect | Use for |
| --- | --- | --- |
| `sonar.exclusions` | file is never analyzed at all | generated code, build output, migrations, config, test scaffolding — **never production logic** |
| `sonar.cpd.exclusions` | bugs/smells still scanned, duplication is not | production code with intentionally parallel structure (components differing only in generic type) |
| `sonar.issue.ignore.multicriteria` | one rule off for a file scope | library-pattern false positives (e.g. TanStack inline cell renderers) |

**Iron rule:** every entry in `cpd.exclusions` and `multicriteria` carries a
**rationale comment** in the file — added only after reviewing a real finding
and judging it intentional/false-positive, never preemptively.

### Prevent duplication while writing (better than suppressing)

SonarQube flags any 10+-line block duplicated across files — about to copy a
component and change only types/labels? Stop and extract a generic first:

```tsx
// ✅ one generic component + thin typed wrappers
function EntityTab<TRow extends BaseRow>({ fetchFn, deleteAction, ... }) { ... }
function FooTab() { return <EntityTab<FooRow> fetchFn={fetchFoo} ... />; }

// ❌ two 100+ line components differing only in type names
```

> Writing code that passes the gate on the first scan (modern-JS idioms,
> `Readonly<>` props, NOSONAR placement) → the **`ugt-clean-code`** skill —
> a different job from this file.

## F. OWASP DC plugin integration

- Install the **Dependency-Check** plugin in SonarQube (Marketplace)
- Plugin v6+ (SonarQube 2025.x) reads the **JSON report only** — the
  Jenkinsfile must pass `--format JSON` and the properties must point at:

```properties
sonar.dependencyCheck.jsonReportPath=dc-report/dependency-check-report.json
sonar.dependencyCheck.htmlReportPath=dc-report/dependency-check-report.html
# thresholds are CVSS scores (0–10), not severity names
sonar.dependencyCheck.severity.high=7.0
sonar.dependencyCheck.severity.medium=4.0
sonar.dependencyCheck.severity.low=0.0
```

## G. Coverage property

`sonar.javascript.lcov.reportPaths=coverage/lcov.info` — this file comes from
`npm run test:coverage`, whose `lcov` reporter `ugt-quality-setup` already
configures. If the path holds no real file, Sonar reports `new_coverage` as 0%
and the Quality Gate blocks every build with no error pointing at the cause.
