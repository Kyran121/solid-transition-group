import { suite, it, expect, beforeEach, afterEach, vi, describe, afterAll } from "vitest";
import TaskManager from "./TaskManager";

const FRAME_WAITING_TIME = 16;

suite.concurrent("TaskManager", () => {
  let errors: string[] = [];

  beforeEach(() => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      return setTimeout(cb, FRAME_WAITING_TIME) as unknown as number; // Mock requestAnimationFrame using setTimeout for controlled timing
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id: number) => {
      clearTimeout(id);
    });
    vi.spyOn(console, "error").mockImplementation((...args: string[]) => {
      errors.push(args.join(" "));
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    errors = [];
  });

  afterAll(() => {
    TaskManager.cancelAllTasks();
  });

  describe("scheduleAnimationFrame", () => {
    it("schedules and executes an animation frame", async () => {
      const callback = vi.fn();
      const taskId = TaskManager.scheduleAnimationFrame(callback);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
      });

      TaskManager.cancelTask(taskId);

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    it("logs error and cleans up task when execution fails", () => {
      const error = "error has occurred";
      const callback = vi.fn().mockImplementation(() => {
        throw new Error(error);
      });
      TaskManager.scheduleAnimationFrame(callback);

      expect(TaskManager.runningTasks).toBe(1);
      vi.runAllTimers();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(errors).toEqual([expect.stringContaining(error)]);
      expect(TaskManager.runningTasks).toBe(0);
    });

    it("returns correct taskId to cancel animation frame", () => {
      const callback = vi.fn();
      const taskId = TaskManager.scheduleAnimationFrame(callback);

      expect(TaskManager.runningTasks).toBe(1);
      TaskManager.cancelTask(taskId);
      vi.runAllTimers();

      expect(callback).not.toHaveBeenCalled();
      expect(TaskManager.runningTasks).toBe(0);
    });
  });

  describe("scheduleTimeout", () => {
    it("schedules and executes a timeout", () => {
      const callback = vi.fn();
      const delay = 100;
      TaskManager.scheduleTimeout(callback, delay);

      expect(TaskManager.runningTasks).toBe(1);
      vi.advanceTimersByTime(delay);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(TaskManager.runningTasks).toBe(0);
    });

    it("logs error and cleans up task when execution fails", () => {
      const error = "error has occurred";
      const callback = vi.fn().mockImplementation(() => {
        throw new Error(error);
      });
      const delay = 100;
      TaskManager.scheduleTimeout(callback, delay);

      expect(TaskManager.runningTasks).toBe(1);
      vi.advanceTimersByTime(delay);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(errors).toEqual([expect.stringContaining(error)]);
      expect(TaskManager.runningTasks).toBe(0);
    });

    it("returns correct taskId to cancel timeout", () => {
      const callback = vi.fn();
      const delay = 100;
      const taskId = TaskManager.scheduleTimeout(callback, delay);

      expect(TaskManager.runningTasks).toBe(1);
      TaskManager.cancelTask(taskId);
      vi.runAllTimers();

      expect(callback).not.toHaveBeenCalled();
      expect(TaskManager.runningTasks).toBe(0);
    });
  });

  describe("scheduleAnimationFrameAfterNext", () => {
    it("schedules and executes an animation frame after the next", () => {
      const callback = vi.fn();
      TaskManager.scheduleAnimationFrameAfterNext(callback);

      expect(TaskManager.runningTasks).toBe(1);
      vi.advanceTimersByTime(FRAME_WAITING_TIME);

      expect(TaskManager.runningTasks).toBe(1);
      vi.advanceTimersByTime(FRAME_WAITING_TIME);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(TaskManager.runningTasks).toBe(0);
    });

    it("logs error and cleans up task when execution fails", () => {
      const error = "error has occurred";
      const callback = vi.fn().mockImplementation(() => {
        throw new Error(error);
      });
      TaskManager.scheduleAnimationFrameAfterNext(callback);

      expect(TaskManager.runningTasks).toBe(1);
      vi.advanceTimersByTime(FRAME_WAITING_TIME);

      expect(TaskManager.runningTasks).toBe(1);
      vi.advanceTimersByTime(FRAME_WAITING_TIME);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(errors).toEqual([expect.stringContaining(error)]);
      expect(TaskManager.runningTasks).toBe(0);
    });

    it("returns correct taskId to cancel", () => {
      const callback = vi.fn();
      const taskId = TaskManager.scheduleAnimationFrameAfterNext(callback);

      expect(TaskManager.runningTasks).toBe(1);
      TaskManager.cancelTask(taskId);
      vi.runAllTimers();

      expect(callback).not.toHaveBeenCalled();
      expect(TaskManager.runningTasks).toBe(0);
    });
  });

  describe("cancelAllTasks", () => {
    it("cancels all scheduled tasks", () => {
      const timeoutCallback = vi.fn();
      TaskManager.scheduleTimeout(timeoutCallback, 100);

      const animationCallback = vi.fn();
      TaskManager.scheduleAnimationFrame(animationCallback);
      TaskManager.scheduleAnimationFrameAfterNext(animationCallback);

      expect(TaskManager.runningTasks).toBe(3);

      TaskManager.cancelAllTasks();
      vi.runAllTimers();

      expect(timeoutCallback).not.toHaveBeenCalled();
      expect(animationCallback).not.toHaveBeenCalled();

      expect(TaskManager.runningTasks).toBe(0);
    });
  });
});
