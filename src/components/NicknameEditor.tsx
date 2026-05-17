"use client";
import { useState } from "react";
import { useUser } from "@/components/AuthProvider";

const NICK_RE = /^[֐-׿A-Za-z0-9 _-]{2,18}$/;

export function NicknameEditor() {
  const { userRow, updateNickname } = useUser();
  const [value, setValue] = useState(userRow?.nickname ?? "");
  const [status, setStatus] = useState<null | "ok" | string>(null);
  const [saving, setSaving] = useState(false);

  if (!userRow) return null;

  const handleSave = async () => {
    if (!NICK_RE.test(value.trim())) {
      setStatus("רק עברית/אנגלית/ספרות, 2–18 תווים");
      return;
    }
    setSaving(true);
    const { error } = await updateNickname(value);
    setSaving(false);
    setStatus(error ?? "ok");
    if (!error) setTimeout(() => setStatus(null), 1500);
  };

  return (
    <div
      dir="rtl"
      className="font-rubik bg-white border-2 border-ink shadow-[-3px_3px_0_0_#0A0A0A] p-3 flex items-center gap-2"
    >
      <span className="text-xs text-gray-concrete font-bold">הכינוי שלך:</span>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={userRow.username}
        maxLength={18}
        className="font-bold bg-bgsoft border-2 border-ink px-2 py-1 flex-1 min-w-0"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-ink text-white font-black px-3 py-1 border-2 border-ink shadow-[-2px_2px_0_0_#73796E] active:translate-x-[-2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
      >
        {saving ? "שומר…" : "שמור"}
      </button>
      {status === "ok" && <span className="text-xs text-survive font-bold">✓</span>}
      {status && status !== "ok" && (
        <span className="text-xs text-death font-bold">{status}</span>
      )}
    </div>
  );
}
