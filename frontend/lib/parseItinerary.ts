// Shared utility — parses a raw Markdown itinerary string from AWS Bedrock
// into a typed structure consumed by both the homepage result panel and the
// trip detail page.

export interface DayBlock {
  heading: string;
  items: string[];
}

export interface DaySection {
  title: string;
  blocks: DayBlock[];
}

/**
 * Converts a Markdown itinerary into an array of DaySection objects.
 *
 * Supports:
 *   ## Day 1 — Title        → new DaySection
 *   ### Morning              → new DayBlock inside the current day
 *   - bullet item            → item added to the current DayBlock
 *   plain paragraph text     → appended to the current DayBlock as an item
 *
 * Also normalises Bedrock quirks like **## Day 1** (bold-wrapped headers).
 */
export function parseItinerary(raw: string): DaySection[] {
  const lines = raw
    .split('\n')
    // Strip **## …** bold-wrapped headers that Bedrock sometimes emits
    .map((l) => l.replace(/^\*\*(##[^*]*)\*\*/, '$1').trimEnd());

  const days: DaySection[] = [];
  let currentDay: DaySection | null = null;
  let currentBlock: DayBlock | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // h2 → new day  (## but not ###)
    if (/^#{2}\s/.test(trimmed) && !/^#{3}/.test(trimmed)) {
      if (currentBlock && currentDay) currentDay.blocks.push(currentBlock);
      if (currentDay) days.push(currentDay);
      currentDay  = { title: trimmed.replace(/^#{2}\s*/, ''), blocks: [] };
      currentBlock = null;

    // h3 → new time-of-day block
    } else if (/^#{3}\s/.test(trimmed)) {
      if (currentBlock && currentDay) currentDay.blocks.push(currentBlock);
      currentBlock = { heading: trimmed.replace(/^#{3}\s*/, ''), items: [] };

    // bullet list item
    } else if (/^[-*]\s/.test(trimmed)) {
      const text = trimmed.replace(/^[-*]\s*/, '');
      if (currentBlock) {
        currentBlock.items.push(text);
      } else if (currentDay) {
        // loose bullet before any h3 — attach to last block
        const last = currentDay.blocks[currentDay.blocks.length - 1];
        if (last) last.items.push(text);
      }

    // plain paragraph
    } else {
      if (currentBlock) currentBlock.items.push(trimmed);
    }
  }

  // Flush remaining
  if (currentBlock && currentDay) currentDay.blocks.push(currentBlock);
  if (currentDay) days.push(currentDay);

  return days;
}
