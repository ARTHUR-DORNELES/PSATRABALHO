export const INSCRIPTION_OPENS = new Date('2026-06-01T00:00:00Z');

export function isInscriptionOpen(now: Date = new Date()): boolean {
  return now >= INSCRIPTION_OPENS;
}
