import { describe, suite, it, expect } from "vitest";
import { formatHTML } from "./HTMLFormatter";

suite("HTMLFormatter", () => {
  describe("formatHTML", () => {
    it("formats simple nested HTML with no attributes", () => {
      const input = "<div><span>Hello!</span></div>";
      const expected = `<div>
  <span>
    Hello!
  </span>
</div>`;
      expect(formatHTML(input)).toBe(expected);
    });

    it("formats simple nested HTML with attributes (double quotes)", () => {
      const input = '<div class="enter enter-from" scoped><span>Hello!</span></div>';
      const expected = `<div
  class="enter enter-from"
  scoped
>
  <span>
    Hello!
  </span>
</div>`;
      expect(formatHTML(input)).toBe(expected);
    });

    it("formats simple nested HTML with attributes (single quotes converted to double quotes)", () => {
      const input = "<div class='enter enter-from' scoped><span>Hello!</span></div>";
      const expected = `<div
  class="enter enter-from"
  scoped
>
  <span>
    Hello!
  </span>
</div>`;
      expect(formatHTML(input)).toBe(expected);
    });
  });
});
