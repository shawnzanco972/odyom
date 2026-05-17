"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrutalButton } from "@/components/BrutalButton";
import type { MyGroupsResponse } from "@/app/api/me/groups/route";
import type { CreateGroupResponse } from "@/app/api/groups/route";

type MyGroup = MyGroupsResponse["groups"][number];

export function GroupsSection({ isAnon }: { isAnon: boolean }) {
  const router = useRouter();
  const [groups, setGroups] = useState<MyGroup[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me/groups", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as MyGroupsResponse;
        setGroups(json.groups);
      } else {
        setGroups([]);
      }
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleCreate = async () => {
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setError("שם הקבוצה חייב להיות 2-60 תווים");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setCreating(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({} as { error?: string }));
      setError(json.error ?? "יצירה נכשלה");
      return;
    }
    const json = (await res.json()) as CreateGroupResponse;
    setName("");
    await refresh();
    router.push(`/groups/${json.slug}`);
  };

  return (
    <div
      dir="rtl"
      className="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] rounded-xl p-4 font-rubik flex flex-col gap-3"
    >
      <h3 className="font-black text-base">החבורות שלי 👥</h3>

      {/* My groups list */}
      {!groups && <p className="text-xs font-bold text-gray-concrete">טוען…</p>}
      {groups && groups.length === 0 && (
        <p className="text-xs font-bold text-gray-concrete">
          עדיין לא בקבוצה. פתח אחת ותראה למי באמת יש עצבים.
        </p>
      )}
      {groups && groups.length > 0 && (
        <ul className="flex flex-col gap-2 list-none p-0">
          {groups.map(g => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.slug}`}
                className="flex items-center justify-between gap-2 bg-[#F9FAFB] border-2 border-ink rounded-lg px-3 py-2 hover:bg-[#FEF9C3] transition-colors"
              >
                <span className="font-black truncate">{g.name}</span>
                {g.role === "creator" && (
                  <span className="text-[10px] font-bold bg-ink text-white px-1.5 py-0.5 shrink-0">
                    בעלים
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Create form */}
      <div className="border-t-2 border-ink pt-3 flex flex-col gap-2">
        <label className="text-xs font-bold text-gray-concrete">
          שם החבורה (למשל: &quot;הניצולים מאופן ספייס&quot;, &quot;מילואים 2026&quot;)
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={60}
          placeholder="שם החבורה"
          className="border-2 border-ink px-2 py-1.5 font-bold bg-[#F9FAFB] text-sm"
        />
        {error && <p className="text-xs text-[#DC2626] font-bold">{error}</p>}
        <BrutalButton
          variant="survive"
          onClick={handleCreate}
          disabled={creating}
          className="text-sm py-2 px-3"
        >
          {creating ? "פותח…" : "+ פתח חבורה חדשה"}
        </BrutalButton>
        {isAnon && (
          <p className="text-[10px] font-bold text-[#DC2626]">
            ⚠️ אנונימי — חבר את החשבון עם Google כדי לא לאבד את החבורה.
          </p>
        )}
      </div>
    </div>
  );
}
