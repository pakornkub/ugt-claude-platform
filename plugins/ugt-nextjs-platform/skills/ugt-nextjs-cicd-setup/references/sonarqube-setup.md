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

### OWASP: two reviewed findings with no fixed release (Next.js + MSSQL stack)

The OWASP Dependency Check stage ends **UNSTABLE** (yellow, a HIGH finding) on a
project that follows these skills as written, because of two advisories whose
affected package has **no fixed release yet**. Both were reviewed once for the
whole org stack; neither is exploitable here:

| Advisory | Package | Only reachable via | Why it does not apply |
| --- | --- | --- | --- |
| `GHSA-vfj7-8cjw-p6xm` (HIGH — stack exhaustion on deeply nested brace patterns) | `braces@3.0.3` (latest) | `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` | CI lint only: it expands this repository's own glob patterns, never user input; a devDependency, absent from the standalone image. `npm audit fix` "fixes" it by **downgrading `eslint-config-next` to 14.x, which cannot run Next 16** — do not take it |
| `GHSA-hp3w-g68c-fv3c` (moderate — RangeError when an attacker controls the format string's precision) | `sprintf-js@1.1.3` (latest) | `@prisma/adapter-mssql` → `mssql` → `tedious` | tedious only passes literal format strings written in the library (e.g. `'Unrecognised data type 0x%02X'`, packet debug dumps) — no user-controlled format string reaches `sprintf` |

A project **may** copy these blocks into its `owasp-suppressions.xml` — only after
confirming it has the same dependency path and versions:

```bash
npm ls braces sprintf-js      # braces@3.0.3 under eslint-config-next · sprintf-js@1.1.3 under tedious
```

Any other path (a runtime dependency pulling `braces`, a different version, a
project that feeds user input into a glob/format string) → this review does not
cover it; review that finding yourself. Pin to the **exact version + advisory**
so a new vulnerable version or a different advisory is never hidden, and keep the
`<notes>` (the verify script rejects a `<suppress>` without one):

```xml
<suppress>
   <notes><![CDATA[
      GHSA-vfj7-8cjw-p6xm (braces <= 3.0.3, stack exhaustion on deeply nested brace patterns).
      Not applicable: braces arrives only via eslint-config-next → @next/eslint-plugin-next →
      fast-glob → micromatch, i.e. the lint step on CI, which expands this repository's own glob
      patterns. devDependency, not in the standalone production image, never sees user input.
      No fixed braces release exists yet (3.0.3 is latest); npm audit's "fix" downgrades
      eslint-config-next to 14.x, which does not support Next 16.
      Remove this suppression when braces > 3.0.3 ships.
      Reviewed by: <name>, <date>
   ]]></notes>
   <packageUrl regex="true">^pkg:npm/braces@3\.0\.3$</packageUrl>
   <vulnerabilityName>GHSA-vfj7-8cjw-p6xm</vulnerabilityName>
</suppress>

<suppress>
   <notes><![CDATA[
      GHSA-hp3w-g68c-fv3c (sprintf-js <= 1.1.3, RangeError when an attacker controls the format
      string's precision). Not applicable: sprintf-js arrives via @prisma/adapter-mssql → mssql →
      tedious, and every tedious call site passes a literal format string written in the library —
      no user-controlled format string reaches sprintf.
      No fixed sprintf-js release exists (1.1.3 is latest).
      Remove this suppression when sprintf-js > 1.1.3 ships or tedious drops it.
      Reviewed by: <name>, <date>
   ]]></notes>
   <packageUrl regex="true">^pkg:npm/sprintf-js@1\.1\.3$</packageUrl>
   <vulnerabilityName>GHSA-hp3w-g68c-fv3c</vulnerabilityName>
</suppress>
```

The shipped `assets/owasp-suppressions.xml` stays **empty on purpose** (iron rule
above: never suppress preemptively) — add these only when the stage actually
reports them. **Remove each block when its fixed version ships** (re-check with
`npm ls` after dependency bumps); a suppression outliving its reason is how a
later, different issue in the same package gets silenced.

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
> `Readonly<>` props, NOSONAR placement) → the **`ugt-nextjs-clean-code`** skill —
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
`npm run test:coverage`, whose `lcov` reporter `ugt-nextjs-test-lint-setup` already
configures. If the path holds no real file, Sonar reports `new_coverage` as 0%
and the Quality Gate blocks every build with no error pointing at the cause.
