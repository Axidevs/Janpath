/**
 * server/src/engine/rules/dateParser.js
 *
 * Explicit Indian date parser and comparator.
 *
 * CRITICAL RULE:
 * NEVER use Date.parse. Explicitly parse dd/mm/yyyy and named month forms.
 * Compares against an injectable referenceDate (in IST timezone).
 */

const MONTH_NAMES = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Parses Indian date formats into { year, month, day }.
 * Supported formats:
 * - dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (e.g. 15/03/2026, 5-4-2025)
 * - dd Month yyyy, ddth Month yyyy (e.g. 15 March 2026, 15th March 2026)
 * - Month dd, yyyy (e.g. March 15, 2026)
 *
 * @param {string} text - Raw string containing date
 * @returns {{ year: number, month: number, day: number, raw: string } | null}
 */
export function parseExplicitDate(text) {
  if (typeof text !== 'string') return null;

  const trimmed = text.trim();

  // Pattern 1: dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const numericMatch = trimmed.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10);
    const year = parseInt(numericMatch[3], 10);

    if (month >= 1 && month <= 12) {
      const maxDays = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month];
      if (day >= 1 && day <= maxDays && year >= 1900 && year <= 2100) {
        return { year, month, day, raw: numericMatch[0] };
      }
    }
  }

  // Pattern 2: 15 March 2026 or 15th March 2026
  const textMatch1 = trimmed.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)[,\s]+(\d{4})\b/
  );
  if (textMatch1) {
    const day = parseInt(textMatch1[1], 10);
    const monthKey = textMatch1[2].toLowerCase();
    const year = parseInt(textMatch1[3], 10);
    const month = MONTH_NAMES[monthKey];

    if (month) {
      const maxDays = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month];
      if (day >= 1 && day <= maxDays && year >= 1900 && year <= 2100) {
        return { year, month, day, raw: textMatch1[0] };
      }
    }
  }

  // Pattern 3: March 15, 2026
  const textMatch2 = trimmed.match(
    /\b([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})\b/
  );
  if (textMatch2) {
    const monthKey = textMatch2[1].toLowerCase();
    const day = parseInt(textMatch2[2], 10);
    const year = parseInt(textMatch2[3], 10);
    const month = MONTH_NAMES[monthKey];

    if (month) {
      const maxDays = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month];
      if (day >= 1 && day <= maxDays && year >= 1900 && year <= 2100) {
        return { year, month, day, raw: textMatch2[0] };
      }
    }
  }

  return null;
}

/**
 * Extracts { year, month, day } from referenceDate in IST (UTC+5:30).
 * @param {Date|Object|string} ref
 * @returns {{ year: number, month: number, day: number }}
 */
export function getIstDateComponents(ref = new Date()) {
  if (ref && typeof ref === 'object' && 'year' in ref && 'month' in ref && 'day' in ref) {
    return { year: ref.year, month: ref.month, day: ref.day };
  }

  const d = ref instanceof Date ? ref : new Date(ref);
  // IST is UTC+5.5 hours = +330 minutes
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + 330 * 60000);

  return {
    year: istTime.getFullYear(),
    month: istTime.getMonth() + 1,
    day: istTime.getDate()
  };
}

/**
 * Deterministically checks if a parsed date is strictly earlier than referenceDate in IST.
 *
 * @param {{ year: number, month: number, day: number }} parsedDate
 * @param {Date|Object} [referenceDate] - Injectable reference date
 * @returns {boolean} True if parsedDate < referenceDate
 */
export function isDateStrictlyPast(parsedDate, referenceDate) {
  if (!parsedDate) return false;
  const ref = getIstDateComponents(referenceDate);

  if (parsedDate.year < ref.year) return true;
  if (parsedDate.year > ref.year) return false;

  if (parsedDate.month < ref.month) return true;
  if (parsedDate.month > ref.month) return false;

  return parsedDate.day < ref.day;
}
