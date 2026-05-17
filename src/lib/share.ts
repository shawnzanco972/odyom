// Builders + Web Share API wrapper with clipboard fallback.
// The text block ALREADY contains the share URL — callers must not append it
// a second time when falling back to clipboard.

export function buildShareUrl(referrerId: string | null): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return referrerId ? `${base}/?ref=${referrerId}` : base;
}

export interface ShareTextInput {
  outcome: "survive" | "death";
  streak: number;
  reason: string;
  referrerId: string | null;
}

export function buildShareText(input: ShareTextInput): string {
  const url = buildShareUrl(input.referrerId);
  if (input.outcome === "survive") {
    return [
      `היום שרדתי! 🟢 רצף של ${input.streak} ימים בגלגל של "לשרוד את היום".`,
      "",
      `"${input.reason}"`,
      "",
      `הסיכון עולה בכל שעה. מה איתך? שרוד כאן: ${url}`,
    ].join("\n");
  }
  return [
    `היום מתתי 🔴 הרצף שלי התאפס.`,
    "",
    `"${input.reason}"`,
    "",
    `אם תיכנס תציל אותי. שרוד כאן: ${url}`,
  ].join("\n");
}

export type ShareResult = "shared" | "copied" | "failed";

/**
 * Tries the native Web Share API first, falls back to clipboard.
 * IMPORTANT: `text` already contains the share URL — we do NOT append it
 * again to the clipboard payload.
 */
export async function shareOrCopy(text: string, url: string): Promise<ShareResult> {
  if (typeof navigator === "undefined") return "failed";

  // Native Web Share — pass text + url separately so OS-level share sheets
  // can use the URL for unfurls when supported.
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text, url });
      return "shared";
    } catch (e) {
      if ((e as DOMException | undefined)?.name === "AbortError") return "failed";
      // Otherwise fall through to clipboard.
    }
  }

  // Clipboard fallback: copy ONLY the prebuilt text (which already embeds
  // the URL). Do NOT concatenate `url` again or it'll appear twice.
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
