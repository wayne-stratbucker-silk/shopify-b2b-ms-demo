// Module-level phrase registry — client-side only (one instance per browser tab).
// SearchPhrases Makeswift component writes here; SearchBox reads here.

let phrases: string[] = [];

export function setSearchPhrases(incoming: string[]) {
  phrases = incoming.filter(Boolean);
}

export function getSearchPhrases(): string[] {
  return phrases;
}
