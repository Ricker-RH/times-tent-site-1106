export function getCarouselPreloadIndexes(activeIndex: number, total: number): number[] {
  if (!Number.isFinite(total) || total <= 0) {
    return [];
  }

  const normalizedTotal = Math.max(0, Math.floor(total));
  const normalizedActive = ((Math.floor(activeIndex) % normalizedTotal) + normalizedTotal) % normalizedTotal;
  const indexes = new Set<number>([normalizedActive]);

  if (normalizedTotal > 1) {
    indexes.add((normalizedActive + 1) % normalizedTotal);
    indexes.add((normalizedActive - 1 + normalizedTotal) % normalizedTotal);
  }

  return Array.from(indexes).sort((a, b) => a - b);
}

export function shouldEagerLoadCarouselSlide(slideIndex: number, activeIndex: number, total: number): boolean {
  return getCarouselPreloadIndexes(activeIndex, total).includes(slideIndex);
}
