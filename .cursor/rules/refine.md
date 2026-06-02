# Refine Framework Standards

- Configure resources in src/providers/resources.tsx
- Use @refinedev/supabase data provider for CRUD operations
- Auth provider in src/providers/auth-provider.ts
- Access control in src/providers/access-control-provider.ts
- Forms via useForm from @refinedev/react-hook-form
- Resource names must match Supabase table names exactly
- Use meta.select for joined queries (e.g., "*, customers(first_name, last_name)")
