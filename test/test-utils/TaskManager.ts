class TaskManager {
  private static instance: TaskManager | null = null;
  private taskKillers: Map<number, () => void> = new Map();
  private nextTaskId: number = 1;

  private constructor() {}

  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  get runningTasks(): number {
    return this.taskKillers.size;
  }

  public scheduleAnimationFrame(callback: FrameRequestCallback): number {
    return this.createTask(
      taskId => requestAnimationFrame(() => this.executeTask(callback, taskId)),
      requestId => cancelAnimationFrame(requestId)
    );
  }

  public scheduleTimeout(callback: (...args: any) => void, delay: number = 0): number {
    return this.createTask(
      taskId => setTimeout(() => this.executeTask(callback, taskId), delay) as unknown as number,
      timeoutId => clearTimeout(timeoutId as unknown as number)
    );
  }

  public scheduleAnimationFrameAfterNext(callback: FrameRequestCallback): number {
    return this.scheduleAnimationFrame(() => this.scheduleAnimationFrame(callback));
  }

  public cancelTask(id: number) {
    this.taskKillers.get(id)?.();
    this.taskKillers.delete(id);
  }

  public cancelAllTasks(): void {
    this.taskKillers.forEach(cancel => cancel());
    this.taskKillers.clear();
  }

  private createTask(schedule: (taskId: number) => number, cancel: (id: number) => void): number {
    const taskId = this.getNextTaskId();
    const id = schedule(taskId);
    this.taskKillers.set(taskId, () => cancel(id));
    return taskId;
  }

  private executeTask(callback: (...args: any) => void, taskId: number) {
    try {
      callback();
    } catch (error) {
      console.error("Error executing task:", error);
    } finally {
      this.cleanupTask(taskId);
    }
  }

  private cleanupTask(taskId: number) {
    this.taskKillers.delete(taskId);
  }

  private getNextTaskId(): number {
    return this.nextTaskId++;
  }
}

export default TaskManager.getInstance();
