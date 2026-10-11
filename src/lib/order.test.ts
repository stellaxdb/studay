import { describe, expect, it } from "vitest";
import { mergeVisibleOrder, moveItem } from "@/lib/order";

describe("moveItem", () => {
  it("moves an item down and up", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });
});

describe("mergeVisibleOrder", () => {
  it("reorders visible items while hidden (archived) items keep their slots", () => {
    // x and y are archived and hidden from the list being reordered.
    const all = ["a", "x", "b", "c", "y"];
    expect(mergeVisibleOrder(all, ["c", "a", "b"])).toEqual(["c", "x", "a", "b", "y"]);
  });

  it("is a no-op when the order does not change", () => {
    expect(mergeVisibleOrder(["a", "b"], ["a", "b"])).toEqual(["a", "b"]);
  });
});
