import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import type { PlayRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface MyPlaysResponse {
  plays: PlayRow[];
}

export async function GET(): Promise<NextResponse<MyPlaysResponse | { error: string }>> {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("plays")
    .select("*")
    .eq("user_id", user.id)
    .order("played_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plays: (data ?? []) as PlayRow[] });
}
