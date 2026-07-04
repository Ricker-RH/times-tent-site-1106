export function getDropdownColumnCount(itemCount: number): number {
  if (itemCount >= 15) return 3;
  if (itemCount >= 9) return 2;
  return 1;
}

export function getDropdownWidth(itemCount: number): string | undefined {
  const columnCount = getDropdownColumnCount(itemCount);
  if (columnCount === 3) return "min(560px, calc(100vw - 2rem))";
  if (columnCount === 2) return "min(388px, calc(100vw - 2rem))";
  return undefined;
}

export function getFooterColumnCount(itemCount: number): number {
  if (itemCount >= 15) return 3;
  if (itemCount >= 8) return 2;
  return 1;
}
