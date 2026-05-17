// Streak-tiered madness tag promotion.
export function madnessTagForStreak(streak: number): string {
  if (streak >= 30) return "פסיכופת מוסמך";
  if (streak >= 15) return "חתול עם 7 נשמות";
  if (streak >= 5) return "ניצול תמידי";
  return "ישראלי ממוצע";
}
