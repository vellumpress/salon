/**
 * Sentence stored on a breath. An explicit place wins. The same breath keeps
 * the sentence already saved. A different breath opens on its first sentence.
 */
export function sentenceAtFor(
  current: { breathIndex: number; sentenceAt?: number },
  index: number,
  place?: { sentenceAt?: number },
): number {
  if (place && typeof place.sentenceAt === "number" && place.sentenceAt >= 0) {
    return Math.floor(place.sentenceAt);
  }
  if (index === current.breathIndex && typeof current.sentenceAt === "number" && current.sentenceAt >= 0) {
    return Math.floor(current.sentenceAt);
  }
  return 0;
}
