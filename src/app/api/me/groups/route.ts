import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface MyGroupsResponse {
  groups: { id: number; slug: string; name: string; role: "creator" | "member" }[];
}

export async function GET(): Promise<NextResponse<MyGroupsResponse | { error: string }>> {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: memberships, error } = await supabase
    .from("group_members")
    .select("role, group_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (memberships ?? []).map(m => m.group_id);
  if (ids.length === 0) return NextResponse.json({ groups: [] });

  const { data: groupsRows } = await supabase
    .from("groups")
    .select("id, slug, name")
    .in("id", ids);

  const groupsById = new Map((groupsRows ?? []).map(g => [g.id, g]));
  const groups = (memberships ?? [])
    .map(m => {
      const g = groupsById.get(m.group_id);
      return g ? { id: g.id, slug: g.slug, name: g.name, role: m.role } : null;
    })
    .filter((g): g is { id: number; slug: string; name: string; role: "creator" | "member" } => g !== null);

  return NextResponse.json({ groups });
}
