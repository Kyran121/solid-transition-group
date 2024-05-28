import type { TransitionProps } from "../../src";
import { render } from "@solidjs/testing-library";
import { trackDOMContentChanges } from "./DOMContentTracker";
import { formatHTML } from "./HTMLFormatter";
import { Transition, TransitionGroup } from "../../src";
import TaskManager from "./TaskManager";
import { snapshotDiff } from "./snapshotDiff";

const TRANSITION_STAGES = 3;
const TRANSITION_CONTAINER_ID = "transition-container";

export type TransitionComponent = ReturnType<typeof render>;
export type TransitionTriggerExecutor = (component: TransitionComponent) => void;
export type TransitionTrigger = {
  execute: TransitionTriggerExecutor;
  expectedDuration: number;
};
export type TransitionSnapshot = {
  content: string;
  recordedAt: number;
};

/**
 * Analyses transition activity to container marked with {@code data-testid="transition-container"}
 * in the transition component.
 */
export default class ComponentTransitionAnalyser {
  private transitionComponent: TransitionComponent;
  private transitionContainer: Element;
  private transitonTriggers: TransitionTrigger[] = [];
  private capturedSnapshots: TransitionSnapshot[] = [];

  public constructor(transitionComponent: TransitionComponent) {
    this.transitionComponent = transitionComponent;
    this.transitionContainer = this.getTransitionContainer(this.transitionComponent);
  }

  private getTransitionContainer(transitionComponent: TransitionComponent) {
    return transitionComponent.getByTestId(TRANSITION_CONTAINER_ID);
  }

  public addTransitionTrigger(transitionTrigger: TransitionTrigger): ComponentTransitionAnalyser {
    this.transitonTriggers.push(transitionTrigger);
    return this;
  }

  public expectFollowUpTransition(expectedDuration: number): ComponentTransitionAnalyser {
    this.transitonTriggers.push({ execute: () => {}, expectedDuration });
    return this;
  }

  public async analyseTransitionActivity() {
    await this.captureTransitionSnapshots();
    return this.getTransitionActivityReport();
  }

  private async captureTransitionSnapshots() {
    const { untrack } = this.snapshotChangesToTransitionContainer();
    await this.synchronouslyTriggerTransitionEvents();
    untrack();
  }

  private snapshotChangesToTransitionContainer() {
    return trackDOMContentChanges(
      () => this.transitionContainer.innerHTML,
      newContent => {
        const content = formatHTML(newContent);
        const recordedAt = Date.now();
        this.capturedSnapshots.push({ content, recordedAt });
      }
    );
  }

  private async synchronouslyTriggerTransitionEvents() {
    await this.transitonTriggers.reduce(async (previous, { execute: executeTransitionTrigger }) => {
      await previous;
      executeTransitionTrigger(this.transitionComponent);
      await this.waitDurationForTransitionToComplete();
    }, Promise.resolve());
  }

  private async waitDurationForTransitionToComplete() {
    /** wait for transition stages to complete (detailed in {@link getTransitionActivityReport}) */
    await this.waitForNextFrame();
    await Promise.all(this.getTransitioningElements().map(this.waitForTransitionEndEvent));
    await this.waitForNextFrame();
  }

  private async waitForNextFrame() {
    await new Promise(resolve => TaskManager.scheduleAnimationFrameAfterNext(resolve));
  }

  private getTransitioningElements(): HTMLElement[] {
    const transitioning = Array.from(
      this.transitionContainer.querySelectorAll('*[class*="duration"]')
    ).filter(el => parseFloat(getComputedStyle(el).transitionDuration));
    if (transitioning.length === 0) {
      throw new Error("Unable to find any transitioning elements at parent level");
    }
    return transitioning as HTMLElement[];
  }

  private waitForTransitionEndEvent(element: HTMLElement): Promise<void> {
    return new Promise(resolve => {
      const handler = (event: TransitionEvent) => {
        if (event.target === element) {
          element.removeEventListener("transitionend", handler);
          resolve();
        }
      };
      element.addEventListener("transitionend", handler);
    });
  }

  /**
   * Captures and returns an activity report of the transition container, showing
   * how its contents have changed throughout executing all transition triggers.
   * Additionally, given we provide an expected duration with each transition trigger,
   * during report generation, for each transition we will calculate and assert actual
   * time taken equates to or exceeds its expected duration.
   *
   * How?
   *
   * Apart the initial render, snapshots of the transition container are captured when
   * content has changed. There are 3 stages which happen when we execute a transition
   * via {@link Transition}
   *
   * Stage 1 - Applied immediately (no wait time)
   *   - Applying "base" and "from" classes
   *   - When entering, "base" class is {@link TransitionProps.enterActiveClass},
   *     and "from" class is {@link TransitionProps.enterClass}
   *   - When exiting, "base" class is {@link TransitionProps.exitActiveClass},
   *     and "from" class is {@link TransitionProps.exitClass}
   *
   * Stage 2 - Applied next browser frame
   *   - Removing "from" and applying "to" class
   *   - When entering, "to" class is {@link TransitionProps.enterToClass}
   *   - When exiting, "to" class is {@link TransitionProps.exitToClass}
   *
   * Stage 3 - Applied after duration
   *   - Removing "base" and "to" classes
   *
   * To calculate the actual time taken, we need to find out how long it takes to get these
   * 3 snapshots. Since we log a recordedAt time for each snapshot, we do this by calculating
   * the difference between first recordedAt and last recordedAt value (in milliseconds).
   *
   * Note: for move transitions emitted by {@link TransitionGroup} there are two stages:
   *  - Apply move class (no wait time)
   *  - Remove move class (after duration)
   * This is handled as an edge case.
   */
  private getTransitionActivityReport() {
    let formattedReport = "";
    let transitionStage = 1;
    let transitionIndex = 1;
    let transitionStartIndex = 1;
    const expectedDurations: number[] = this.transitonTriggers.map(
      trigger => trigger.expectedDuration
    );
    for (let i = 1; i < this.capturedSnapshots.length; i++) {
      formattedReport += `Render ${i}:`;
      if (transitionStage % TRANSITION_STAGES === 0) {
        transitionStage = this.snapshotInEnterTransition(i)
          ? 1
          : this.snapshotInMoveTransition(i)
            ? 2
            : 0;

        const expectedDuration = expectedDurations.shift();
        const transtionEndIndex = i;
        this.assertTransitionTookDuration(
          transitionIndex++,
          transtionEndIndex,
          transitionStartIndex,
          expectedDuration!
        );
        formattedReport += ` Transition took at least ${expectedDuration}ms`;
        transitionStartIndex = i;
      }
      formattedReport += `\n${this.diffBetweenSnapshots(i, i - 1)}\n\n`;
      transitionStage++;
    }
    return formattedReport.trim();
  }

  private snapshotInEnterTransition(change: number) {
    return this.capturedSnapshots[change]!.content.indexOf("enter-active") !== -1;
  }

  private snapshotInMoveTransition(change: number) {
    return this.capturedSnapshots[change]!.content.indexOf("move-active") !== -1;
  }

  private assertTransitionTookDuration(
    transitionIndex: number,
    transitionEndIndex: number,
    transitionStartIndex: number,
    expectedDuration: number
  ) {
    if (!this.transitionTookDuration(transitionEndIndex, transitionStartIndex, expectedDuration)) {
      throw new Error(
        `Transition #${transitionIndex} failed to take at least ${expectedDuration}ms`
      );
    }
  }

  private transitionTookDuration(
    transtionEndIndex: number,
    transitionStartIndex: number,
    expectedDuration: number
  ) {
    const fpsBuffer = 20;
    const min = expectedDuration - fpsBuffer;
    const max = expectedDuration * 2 + fpsBuffer;
    const actualDuration = this.diffBetweenSnapshotRecordedAtTimesInMs(
      transtionEndIndex,
      transitionStartIndex
    );
    return actualDuration >= min && actualDuration <= max;
  }

  private diffBetweenSnapshotRecordedAtTimesInMs(current: number, previous: number): number {
    const recordedAt = this.capturedSnapshots[current]!.recordedAt;
    const prevRecordedAt = this.capturedSnapshots[previous]!.recordedAt;
    return recordedAt - prevRecordedAt;
  }

  private diffBetweenSnapshots(current: number, previous: number): string {
    return snapshotDiff(
      this.capturedSnapshots[previous]!.content,
      this.capturedSnapshots[current]!.content
    );
  }
}
