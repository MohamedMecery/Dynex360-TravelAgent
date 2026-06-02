import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDbUserAccess } from "@/lib/auth/resolve-db-user-access";
import { activatePendingTenantUser } from "@/lib/users/activate-pending-user";
import { setPasswordSchema } from "@/lib/validation/auth-password";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const access = await resolveDbUserAccess(supabase, user.id);
    if (!access) {
      return NextResponse.json(
        { error: { code: "TENANT_REQUIRED", message: "Tenant membership not found" } },
        { status: 403 }
      );
    }

    if (access.status === "inactive") {
      return NextResponse.json(
        { error: { code: "ACCOUNT_INACTIVE", message: "Account is inactive" } },
        { status: 403 }
      );
    }

    if (access.status === "active") {
      return NextResponse.json(
        { error: { code: "ALREADY_ACTIVE", message: "Account is already active" } },
        { status: 409 }
      );
    }

    if (access.status !== "pending") {
      return NextResponse.json(
        { error: { code: "ACCOUNT_NOT_ACTIVE", message: "Onboarding is not available" } },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const parsed = setPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid password",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (passwordError) {
      return NextResponse.json(
        { error: { code: "PASSWORD_UPDATE_FAILED", message: "Could not set password" } },
        { status: 400 }
      );
    }

    await activatePendingTenantUser(user.id);

    await supabase.auth.signOut();

    return NextResponse.json({
      data: { activated: true, redirectTo: "/login?reason=onboarding_complete" },
    });
  } catch (error) {
    console.error("Onboarding activation error");
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Onboarding failed",
        },
      },
      { status: 500 }
    );
  }
}
