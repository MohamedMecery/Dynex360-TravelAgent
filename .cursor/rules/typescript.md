# TypeScript Standards

- Enable strict mode in tsconfig.json
- No `any` type — use `unknown` and narrow with type guards
- Define interfaces in `src/types/` for all database entities
- Use Zod for runtime validation at API boundaries
- Prefer `interface` over `type` for object shapes
- Export types alongside their primary usage module
