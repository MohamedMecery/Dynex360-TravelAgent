"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4">
          <CardTitle>TravelOS setup required</CardTitle>
          <p className="text-sm text-muted-foreground">
            Supabase credentials are missing or empty in <code className="text-xs">.env.local</code>.
            The app cannot start without them.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Copy <code className="text-xs">.env.example</code> to{" "}
              <code className="text-xs">.env.local</code> if you have not already.
            </li>
            <li>
              Add your project URL and anon key from Supabase Dashboard → Settings → API.
            </li>
            <li>
              Or run local Supabase: <code className="text-xs">npx supabase start</code>, then use{" "}
              <code className="text-xs">npx supabase status</code> for the keys.
            </li>
            <li>Restart the dev server: <code className="text-xs">npm run dev</code></li>
          </ol>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`}
          </pre>
        </CardHeader>
      </Card>
    </div>
  );
}
