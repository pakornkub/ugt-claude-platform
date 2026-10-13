// Stub for the `server-only` package under vitest — the real one throws outside
// a React Server environment, which blocks importing server modules directly in
// tests. Kept inside the project (not aliased into node_modules/next internals)
// so it resolves even in git worktrees without a full node_modules install.
export {};
