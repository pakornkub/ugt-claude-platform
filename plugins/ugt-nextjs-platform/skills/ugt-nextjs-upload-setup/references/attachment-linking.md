# How attachments link to business records — a project decision

The file's **path is always in the database** (`Attachments.StorageKey`) and the
volume is never the source of truth: nothing scans the filesystem to decide what
exists or who may read it. That part is fixed.

**How an attachment relates to the record it belongs to is not.** The skill
ships one pattern because a skeleton needs one, not because it is the right
answer everywhere. Pick deliberately at install time and record the choice in
`docs/project-context/decisions.md`.

## Pattern A — polymorphic (what the skeleton ships)

```prisma
entityType String  @map("EntityType")   // "LeaveRequest"
entityId   String  @map("EntityId")     // that row's id
@@index([entityType, entityId])
```

- **Good when** many record types carry attachments and the list will grow —
  one table serves all of them, and adding a new type costs no migration.
- **Cost**: the database cannot enforce the relationship. Delete a
  `LeaveRequest` and its attachment rows survive as orphans, invisible to any
  FK constraint. The cleanup job becomes load-bearing, not a nicety.
- `canReadAttachment` switches on `entityType`, so every new type needs a case —
  and the default branch denies, which is the safe direction.

## Pattern B — a real foreign key per owning type

```prisma
model attachment {
  leaveRequestId String?      @map("LeaveRequestId")
  leaveRequest   leaveRequest? @relation(fields: [leaveRequestId], references: [id])
}
```

- **Good when** attachments belong to one or two record types and integrity
  matters more than flexibility — cascade delete works, orphans cannot happen,
  and `include: { attachments: true }` is a normal Prisma query.
- **Cost**: a nullable column per owning type, and a migration each time a new
  type gains attachments. Past ~3 types this gets ugly.

## Pattern C — the column lives on the business table

```prisma
model user { avatarAttachmentId String? @map("AvatarAttachmentId") }
```

- **Good when** a record has **exactly one** file — a profile photo, a signed
  copy of a contract. The "one" is enforced by the schema instead of by
  application code that has to remember.
- **Cost**: does not generalise to lists; do not stretch it into "one, but
  sometimes three".

## Choosing

| Question | Leads to |
| --- | --- |
| Many record types, list will grow? | A |
| One or two types, and orphans are unacceptable? | B |
| Exactly one file per record, forever? | C |

Mixing is fine: C for the avatar, A for everything workflow-related. What is
not fine is leaving it unstated — the next person reads the skeleton's
`entityType` and assumes it was a decision.

## Whatever the pattern, these still hold

- **The path is generated**, never derived from the uploaded filename, and the
  original name is stored for display only.
- **Soft delete on the row** (`IsDeleted = 1`); bytes go later via retention.
- **Downloads never read the link directly** — they go through
  `canReadAttachment`, which loads the owning record and compares it against the
  session identity. With pattern B or C, that function reads the FK instead of
  switching on `entityType`; the guard order does not change.
- **Orphan sweep**: patterns A and C have no FK protecting them, so the
  retention job should also delete attachment rows whose owning record is gone.
  Pattern B gets this from the database for free.
