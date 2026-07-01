/**
 * Returns up to 2 uppercase initials from a display name.
 * Safe against null, undefined, and empty strings — returns '?' as fallback.
 *
 * Examples:
 *   getInitials('Jane Doe')   → 'JD'
 *   getInitials('Alice')      → 'A'
 *   getInitials('')           → '?'
 *   getInitials(undefined)    → '?'
 */
export function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}
