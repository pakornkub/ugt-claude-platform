# Org-level Hard Boundary — a document for the IT team (NOT installed by `/ugt-nextjs-setup`)

> **Read first**: this is the list of things to request from IT / machine
> administrators — the skill cannot install it, because it requires writing a
> file into a system location on every machine and distributing it via
> MDM/Group Policy/Ansible. Until this is deployed, **there is no hard
> boundary** — don't mistake this document for having one.

> **Maintenance:** editing this file? `grep` the stack platforms for restated
> text and update it too — currently `ugt-nextjs-platform`'s
> `ugt-nextjs-setup` and `ugt-nextjs-auth-setup` reference this boundary.
> Bump the platform's `plugin.json` version and CHANGELOG when you do.

## Why it must be the managed level

Rules written in `CLAUDE.md` or in a skill are **requests**, not enforcement —
the Claude Code docs state it directly: *"Settings rules are enforced by the
client regardless of what Claude decides to do. CLAUDE.md instructions shape
Claude's behavior but are not a hard enforcement layer."*

`managed-settings.json` is the only layer **neither user nor project settings
can override** — and a managed CLAUDE.md is the only one `claudeMdExcludes`
cannot exclude.

## File locations

| OS | path |
| --- | --- |
| Windows | `C:\Program Files\ClaudeCode\managed-settings.json` |
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux / WSL | `/etc/claude-code/managed-settings.json` |

A managed CLAUDE.md goes in the same folder as `CLAUDE.md`, or put its content
directly in the `claudeMd` key of `managed-settings.json` (that key is honored
only in managed/policy settings).

## Proposed starting template

```json
{
  "permissions": {
    "deny": [
      "Read(.env.production)",
      "Read(//**/id_rsa)",
      "Read(~/.aws/**)",
      "Read(~/.ssh/**)",
      "Bash(git push --force*)",
      "Bash(git push -f *)",
      "Bash(curl * | sh)",
      "Bash(curl * | bash)"
    ]
  },
  "extraKnownMarketplaces": {
    "ugt": {
      "source": { "source": "github", "repo": "pakornkub/ugt-claude-platform" }
    }
  },
  "enabledPlugins": {
    "ugt-nextjs-standard@ugt": true
  },
  "claudeMd": "Never commit secrets to git under any circumstances. npm run build must pass before every push. Employee data is personal data under PDPA — never send it outside org systems."
}
```

What this buys:

- **deny** — rules the client enforces itself, outside the model's decisions,
  and projects cannot switch off
- **extraKnownMarketplaces + enabledPlugins** — every machine gets
  `ugt-nextjs-standard` without each person running `/plugin marketplace add`
- **claudeMd** — text present in every session of every project on the machine,
  which users cannot exclude

## Additional options worth considering

| Key | What it does | Use when |
| --- | --- | --- |
| `sandbox.enabled` | Enforce sandbox isolation | You want the agent confined to project scope |
| `strictKnownMarketplaces` | Restrict which marketplaces can be added | Only org-reviewed plugins allowed (pair with `extraKnownMarketplaces` — it doesn't register marketplaces by itself) |
| `forceLoginMethod` / `forceLoginOrgUUID` | Lock login method and org | Prevent personal accounts being used for company work |

## What managed settings cannot do yet

**Org-wide audit trail** — `managed-settings.json` has no key for shipping logs
off the machine. Today `ugt-nextjs-platform` writes audit logs to
`.claude/logs/audit-<date>.jsonl` inside the project (via the `PostToolUse` /
`PostToolUseFailure` / `InstructionsLoaded` hooks). Centralizing them requires
an additional hook posting `type: "http"` to a collector endpoint — a next-phase
task that needs someone to own that endpoint.

## Checklist for IT

- [ ] Choose the `permissions.deny` set to enforce (start from the template above)
- [ ] Decide on `sandbox.enabled` and `strictKnownMarketplaces`
- [ ] Write `managed-settings.json` and distribute via MDM / Group Policy / Ansible
- [ ] Test on a sample machine: run `claude`, confirm a denied action is blocked,
      and `/plugin` shows `ugt-nextjs-standard` installed
- [ ] Announce the enforced rules to the team — rules nobody knows about get
      reported as bugs
