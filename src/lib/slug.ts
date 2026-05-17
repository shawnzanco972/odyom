// 8-char url-safe random slug for group invite links.
// ~218 trillion possible slugs — collision probability negligible for our scale.
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateSlug(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
