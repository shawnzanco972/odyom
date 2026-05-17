import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const { slug } = await ctx.params;
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", slug)
    .single();
  if (groupErr || !group) {
    return NextResponse.json({ error: "group not found" }, { status: 404 });
  }

  const { error: insertErr } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "member" });
  if (insertErr) {
    // Already a member is fine — return success so the client routes normally.
    if (insertErr.code !== "23505") {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
