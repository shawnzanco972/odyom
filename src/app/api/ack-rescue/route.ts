import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Clears the `rescue_pending` flag on the authenticated user's row.
 * RLS allows self-update so no service role is required.
 */
export async function POST(): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { error } = await supabase
    .from("users")
    .update({ rescue_pending: false })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
