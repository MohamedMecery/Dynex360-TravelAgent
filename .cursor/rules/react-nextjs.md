# React & Next.js Standards

- Use functional components with hooks only
- Server Components by default; add "use client" only when needed (interactivity, hooks)
- Use Next.js App Router file conventions (page.tsx, layout.tsx, route.ts)
- Data fetching in client components via Refine hooks (useList, useShow, useForm)
- API routes in src/app/api/ with Supabase server client for auth
- Never fetch directly in Server Components for Refine-managed resources
