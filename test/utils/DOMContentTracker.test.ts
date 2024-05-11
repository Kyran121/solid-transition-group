import { describe, it, expect, suite, beforeEach, afterEach, vi } from "vitest";
import { trackDOMContentChanges } from "./DOMContentTracker";
import TaskManager from "./TaskManager";

const FRAME_WAITING_TIME = 16; // assumes 63 fps, given a frame executes every 16ms

suite("DOMContentTracker", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(cb => {
      return setTimeout(cb, FRAME_WAITING_TIME) as unknown as number; // Mock requestAnimationFrame using setTimeout for controlled timing
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();

    // required as trackDOMContentChanges recursively schedules an animation frame
    TaskManager.cancelAllTasks();
  });

  describe("trackDOMContentChanges", () => {
    it("calls onContentChange with initial content on first call", () => {
      const initialContent = "initial";
      const getContent = vi.fn(() => initialContent);
      const onContentChange = vi.fn();

      trackDOMContentChanges(getContent, onContentChange);

      expect(onContentChange).toHaveBeenCalledTimes(1);
      expect(onContentChange).toHaveBeenCalledWith(initialContent);
      expect(getContent).toHaveBeenCalledTimes(1);
    });

    it("calls onContentChange with changed content in animation frame", () => {
      const getContent = vi
        .fn()
        .mockReturnValueOnce("initial") // Initial call
        .mockReturnValueOnce("changed"); // Animation frame call
      const onContentChange = vi.fn();

      trackDOMContentChanges(getContent, onContentChange);

      vi.advanceTimersByTime(FRAME_WAITING_TIME);

      expect(getContent).toHaveBeenCalledTimes(2);

      expect(onContentChange).toHaveBeenCalledTimes(2);
      expect(onContentChange).toHaveBeenNthCalledWith(1, "initial");
      expect(onContentChange).toHaveBeenNthCalledWith(2, "changed");
    });

    it("does not call onContentChange with unchanged content in animation frame", () => {
      const getContent = vi.fn(() => "constant");
      const onContentChange = vi.fn();

      trackDOMContentChanges(getContent, onContentChange);

      vi.advanceTimersByTime(FRAME_WAITING_TIME);

      expect(getContent).toHaveBeenCalledTimes(2);
      expect(onContentChange).toHaveBeenCalledTimes(1);
    });

    it("stops tracking when untrack is called (+0 frames in)", () => {
      const getContent = vi.fn(() => "constant");
      const onContentChange = vi.fn();

      const { untrack } = trackDOMContentChanges(getContent, onContentChange);
      untrack();

      vi.advanceTimersByTime(FRAME_WAITING_TIME);
      expect(getContent).toHaveBeenCalledTimes(1);
    });

    it("stops tracking when untrack is called (+1 frames in)", () => {
      const getContent = vi
        .fn()
        .mockReturnValueOnce("initial") // Initial call
        .mockReturnValueOnce("changed"); // Animation frame call
      const onContentChange = vi.fn();

      const { untrack } = trackDOMContentChanges(getContent, onContentChange);

      vi.advanceTimersByTime(FRAME_WAITING_TIME);
      untrack();

      vi.advanceTimersByTime(FRAME_WAITING_TIME);

      expect(getContent).toHaveBeenCalledTimes(2);
    });
  });
});
