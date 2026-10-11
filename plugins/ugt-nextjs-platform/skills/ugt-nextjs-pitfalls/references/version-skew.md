# Version Skew — a page left open across a deploy (`UnrecognizedActionError`)

The client half of version skew: what a form must do when its Server Action call reaches a newer build.

## Symptom

Right after a deploy, a page that was already open fails **every**
Server Action call ("ส่งข้อมูลไม่ได้หลัง deploy"). Browser console:
`UnrecognizedActionError: Server Action "404a8f…" was not found on the server`
+ `POST …/<route> 409 (Conflict)`; the UI shows only its generic failure
message. A refresh fixes it — and on a long form the typed text is lost with it.
Jenkins redeploys on every push and people keep tabs open, so every project hits
this.

## Root cause

Server Action ids change with every build; the old client bundle
still references the previous ids. The deploy half (`next.config`
`deploymentId` ← Docker build arg ← Jenkins build number + commit, so Next.js can
detect the skew) is installed by `ugt-nextjs-cicd-setup`
(`references/version-skew.md`). Even with it, a Server Action that reaches a
newer build raises `UnrecognizedActionError` on the client — a generic "try
again" message is the wrong answer, because retrying with the same stale bundle
fails the same way.

## Fix

Catch it by type (`unstable_isUnrecognizedActionError`, exported from
`next/navigation` in Next 15.4+/16), keep what the user typed, and offer a
reload that restores it:

```ts
import { unstable_isUnrecognizedActionError } from 'next/navigation';

// lib/form-draft.ts — sessionStorage: this tab only, read ONCE, removed as it is read
const KEY = 'my-form-draft-v1'; // one key per form
export function saveDraft(values: Record<string, string | boolean>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(values));
  } catch {
    // storage blocked (private mode / policy) — the reload simply starts empty
  }
}
export function takeDraft<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// in the submit handler (or a mutation's onError)
try {
  await submitAction(values);
} catch (error) {
  if (unstable_isUnrecognizedActionError(error)) {
    saveDraft(values); // only what the user typed — nothing you can re-derive after the reload
    openReloadDialog(); // "The system was just updated — reload to continue. Your input is kept."
    return; // the dialog's button calls location.reload()
  }
  showGenericError();
}

// on mount, once — after hydration, so the server render and the first client render match
useEffect(() => {
  const draft = takeDraft<FormValues>();
  if (draft) form.reset(draft);
}, []);
```

- **Read-once** (`takeDraft` removes the key) — a draft that outlived the
  reload would silently overwrite a form the person later opens fresh.
- Keep only what the person typed, no PII beyond that. `File` objects cannot be
  stored — tell the user in the dialog that attachments must be chosen again.
- Restore in an effect after mount, not during render, or hydration mismatches.
- No background `router.refresh()` / polling on form pages — on a
  `deploymentId` mismatch a refresh reloads the page and drops a half-typed form.
- Test it: mock the action to reject with an error for which
  `unstable_isUnrecognizedActionError` returns true (mock `next/navigation`),
  and assert the draft is saved, the reload prompt shows, and the draft is
  restored exactly once.
- This does not replace the `deploymentId` fix: that lets Next.js notice the skew,
  this handler covers the Server Action call that still fails on an old page.

**Origin.** ugt-voice-platform · 2026-10-09
