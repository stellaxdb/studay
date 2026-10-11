/**
 * Applies a new order for the items currently shown (e.g. only active
 * subjects) to the full ordered list, keeping hidden items in their slots.
 */
export function mergeVisibleOrder(allIds: string[], visibleInNewOrder: string[]): string[] {
  const visible = new Set(visibleInNewOrder);
  const result = [...allIds];
  let next = 0;
  for (let i = 0; i < result.length; i += 1) {
    if (visible.has(result[i])) {
      result[i] = visibleInNewOrder[next];
      next += 1;
    }
  }
  return result;
}

/** Moves one item from `from` to `to` (array indices). */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
