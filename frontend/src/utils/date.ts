/**
 * Derive a person's age from a `YYYY-MM-DD` birth date string.
 *
 * The calculation is day-safe: it only counts the birthday once the calendar
 * day actually arrives (Feb 29 handled by normal JS date rollover on that
 * logic), and never under/over-shoots within the current year like a naive
 * `Math.floor(yearDiff / 365.25)` split would.
 *
 * Returns `null` when the input is missing or not in the expected format so
 * callers can fall back to a placeholder instead of showing a wrong value.
 */
export function ageFromBornDate(bornDate?: string | null): number | null {
  if (!bornDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bornDate);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const day = Number(m[3]);
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month; // getMonth() is 0-based
  const dayDiff = today.getDate() - day;
  // If today is before the birthday this year, we haven't turned that age yet.
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
