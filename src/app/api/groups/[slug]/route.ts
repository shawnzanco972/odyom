import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { todayKeyIST } from "@/lib/time";
import { normalizeUserRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface GroupMemberSummary {
  user_id: string;
  display: string;          // nickname || username
  madness_tag: string;
  current_streak: number;
  highest_streak: number;
  total_score: number;
  role: "creator" | "member";
  joined_at: string;
}

export interface GroupActivity {
  survivedToday: number;
  diedToday: number;
  pendingToday: number;     // members who haven't played today yet
}

export interface GroupDetailsResponse {
  slug: string;
  name: string;
  created_at: string;
  members: GroupMemberSummary[];
  activity: GroupActivity;
  isMember: boolean;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<NextResponse<GroupDetailsResponse | { error: string }>> {
  const { slug } = await ctx.params;
  const supabase = await getServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Look up the group + roster in two queries (RLS allows public read).
  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .select("id, slug, name, created_at")
    .eq("slug", slug)
    .single();
  if (groupErr || !group) {
    return NextResponse.json({ error: "group not found" }, { status: 404 });
  }

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", group.id);

  const userIds = (memberRows ?? []).map(m => m.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({
      slug: group.slug,
      name: group.name,
      created_at: group.created_at,
      members: [],
      activity: { survivedToday: 0, diedToday: 0, pendingToday: 0 },
      isMember: false,
    });
  }

  const { data: profileRows } = await supabase
    .from("users")
    .select("id, username, nickname, total_score, current_streak, highest_streak, madness_tag, last_outcome, last_played_at, last_played_date, last_reason, seen_reasons, referrer_id, streak_before_last_death, rescue_pending, has_played_ever")
    .in("id", userIds);

  const profiles = new Map((profileRows ?? []).map(r => [r.id, normalizeUserRow(r)]));

  const members: GroupMemberSummary[] = (memberRows ?? []).map(m => {
    const p = profiles.get(m.user_id);
    return {
      user_id: m.user_id,
      display: p?.nickname?.trim() || p?.username || "ישראלי",
      madness_tag: p?.madness_tag ?? "ישראלי ממוצע",
      current_streak: p?.current_streak ?? 0,
      highest_streak: p?.highest_streak ?? 0,
      total_score: p?.total_score ?? 0,
      role: m.role,
      joined_at: m.joined_at,
    };
  });

  // Daily activity strip: count by today's last_played_date + outcome.
  const today = todayKeyIST(new Date());
  let survived = 0, died = 0;
  for (const id of userIds) {
    const p = profiles.get(id);
    if (p?.last_played_date === today && p?.last_outcome) {
      if (p.last_outcome === "survive") survived++;
      else if (p.last_outcome === "death") died++;
    }
  }
  const pending = userIds.length - survived - died;

  const isMember = !!user && userIds.includes(user.id);

  return NextResponse.json({
    slug: group.slug,
    name: group.name,
    created_at: group.created_at,
    members,
    activity: { survivedToday: survived, diedToday: died, pendingToday: pending },
    isMember,
  });
}
