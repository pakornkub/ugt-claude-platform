---
type: regex
pattern: 'model\s+\w*[Aa]ttachment\w*\s*\{[\s\S]*?entityType[\s\S]*?entityId'
target: { source: file, path: prisma/schema.prisma }
---
prisma/schema.prisma gained the Attachments model with the polymorphic entityType + entityId link the user picked.
