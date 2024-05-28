import { describe, it, expect, suite, afterEach, vi } from "vitest";
import { trackDOMContentChanges } from "./DOMContentTracker";

suite.skip("DOMContentTracker", () => {
  describe.concurrent("trackDOMContentChanges", () => {
    it("calls onContentChange with initial content on first call", async ({ expect }) => {
      const getContent = vi.fn(() => "initial");
      const onContentChange = vi.fn();

      const { untrack } = trackDOMContentChanges(getContent, onContentChange);

      await vi.waitFor(() => {
        expect(onContentChange).toHaveBeenCalledWith("initial");
      });

      untrack();

      await vi.waitFor(() => {
        expect(onContentChange).toHaveBeenCalledOnce();
      });
    });

    it("calls onContentChange with changed content in animation frame", async ({ expect }) => {
      const getContent = vi
        .fn()
        .mockReturnValue("third")
        .mockReturnValueOnce("initial")
        .mockReturnValueOnce("second");
      const onContentChange = vi.fn();

      const { untrack } = trackDOMContentChanges(getContent, onContentChange);

      await vi.waitFor(() => {
        expect(onContentChange).toHaveBeenNthCalledWith(1, "initial");
        expect(onContentChange).toHaveBeenNthCalledWith(2, "second");
        expect(onContentChange).toHaveBeenNthCalledWith(3, "third");
      });

      untrack();

      await vi.waitFor(() => {
        expect(onContentChange).toHaveBeenCalledTimes(3);
      });
    });
  });
});
