import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/slug";

export const runtime = "nodejs";

export interface CreateGroupResponse {
  slug: string;
  name: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<CreateGroupResponse | { error: string }>> {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim();
  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "שם הקבוצה חייב להיות 2-60 תווים" }, { status: 400 });
  }

  // Retry slug generation if (rare) collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    const { data: group, error: insertErr } = await supabase
      .from("groups")
      .insert({ slug, name, created_by: user.id })
      .select()
      .single();
    if (insertErr) {
      if (insertErr.code === "23505") continue; // unique_violation on slug — retry
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
    if (!group) continue;

    // Add creator as the first member with role='creator'.
    const { error: memberErr } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "creator",
    });
    if (memberErr) {
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }

    return NextResponse.json({ slug: group.slug, name: group.name });
  }
  return NextResponse.json({ error: "couldn't allocate group slug" }, { status: 500 });
}
