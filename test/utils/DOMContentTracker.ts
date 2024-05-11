import TaskManager from "./TaskManager";

export function trackDOMContentChanges<TType>(
  getContent: () => TType,
  onContentChange: (newValue: TType) => void
) {
  let taskId: number;
  let lastContentValue: TType;
  let stopTracking = false;

  function notifyIfContentChange() {
    if (stopTracking) return;
    const currentContent = getContent();
    if (lastContentValue !== currentContent) {
      lastContentValue = currentContent;
      onContentChange(currentContent);
    }
    taskId = TaskManager.scheduleAnimationFrame(notifyIfContentChange);
  }

  notifyIfContentChange();

  return {
    untrack: () => {
      stopTracking = true;
      TaskManager.cancelTask(taskId);
    }
  };
}
