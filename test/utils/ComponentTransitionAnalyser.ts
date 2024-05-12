import { Component } from "solid-js";
import { render } from "@solidjs/testing-library";
import { trackDOMContentChanges } from "./DOMContentTracker";
import { formatHTML } from "./HTMLFormatter";
import { type TransitionProps, Transition } from "../../src";
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
  recordedAt: bigint;
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

  public constructor(transitionComponent: Component) {
    this.transitionComponent = render(transitionComponent as any);
    this.transitionContainer = this.getTransitionContainer(this.transitionComponent);
  }

  private getTransitionContainer(transitionComponent: TransitionComponent) {
    return transitionComponent.getByTestId(TRANSITION_CONTAINER_ID);
  }

  public addTransitionTrigger(transitionTrigger: TransitionTrigger) {
    this.transitonTriggers.push(transitionTrigger);
  }

  public expectFollowUpTransition(expectedDuration: number) {
    this.transitonTriggers.push({ execute: () => {}, expectedDuration });
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
        const recordedAt = process.hrtime.bigint();
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
    await this.waitForDuration(this.extractHighestDurationFromTransitioningElements());

    this.dispatchAnimationEndEvent(); // See https://github.com/jsdom/jsdom/issues/3239
    await this.waitForNextFrame(); // Wait additional frame to ensure completion
  }

  private extractHighestDurationFromTransitioningElements(): number {
    const transitionDurations = Array.from(this.getTransitioningElements()).map(
      transitioningElement =>
        parseInt(window.getComputedStyle(transitioningElement).transitionDuration)
    );
    let transitionDuration = transitionDurations[0]!;
    for (let i = 1; i < transitionDurations.length; i++) {
      transitionDuration = Math.max(transitionDurations[i]!, transitionDuration);
    }
    return transitionDuration;
  }

  private getTransitioningElements(): HTMLDivElement[] {
    const transitioning = Array.from(this.transitionContainer.querySelectorAll("div")).filter(
      transitioningElement => window.getComputedStyle(transitioningElement).transitionDuration
    );
    if (transitioning.length === 0) {
      throw new Error("Unable to extract transitionDuration style from transition container child!");
    }
    return transitioning;
  }

  private async waitForNextFrame() {
    await new Promise(resolve => TaskManager.scheduleAnimationFrameAfterNext(resolve));
  }

  private async waitForDuration(duration: number) {
    await new Promise(resolve => TaskManager.scheduleTimeout(resolve, duration));
  }

  private dispatchAnimationEndEvent() {
    this.getTransitioningElements().forEach(transitioningElement =>
      transitioningElement.dispatchEvent(new Event("animationend"))
    );
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
   */
  private getTransitionActivityReport() {
    let formattedReport = "";
    let stage = 1,
      transiton = 1;

    const durations: number[] = this.transitonTriggers.map(trigger => trigger.expectedDuration);
    for (let change = 1; change < this.capturedSnapshots.length; change++) {
      formattedReport += `Render ${change}:`;

      if (stage % TRANSITION_STAGES === 0) {
        stage = Number(this.snapshotAtChangeInEnterTransition(change));
        const duration = durations.shift();
        this.assertNthTransitionChangeTookDuration(transiton++, change, duration!);
        formattedReport += ` Transition took at least ${duration}ms`;
      }

      formattedReport += `\n${this.diffBetweenSnapshotsAtChanges(change, change - 1)}\n\n`;
      stage++;
    }
    return formattedReport.trim();
  }

  private snapshotAtChangeInEnterTransition(change: number) {
    return this.capturedSnapshots[change]!.content.indexOf("enter-active") !== -1;
  }

  private assertNthTransitionChangeTookDuration(n: number, change: number, duration: number) {
    if (!this.transitionChangeTookDuration(change, duration)) {
      throw new Error(`Transition #${n} failed to take at least ${duration}ms`);
    }
  }

  private transitionChangeTookDuration(change: number, duration: number) {
    const frameWaitTime = this.timeElapsedInMsBetweenSnapshotsAtChanges(change - 1, change - 2);
    const actualDuration = this.timeElapsedInMsBetweenSnapshotsAtChanges(change, change - 2);
    return actualDuration >= duration && actualDuration <= duration + frameWaitTime * 2;
  }

  private timeElapsedInMsBetweenSnapshotsAtChanges(current: number, previous: number): number {
    const recordedAt = this.capturedSnapshots[current]!.recordedAt;
    const prevRecordedAt = this.capturedSnapshots[previous]!.recordedAt;
    return Number((recordedAt - prevRecordedAt) / BigInt(1e6));
  }

  private diffBetweenSnapshotsAtChanges(current: number, previous: number): string {
    return snapshotDiff(
      this.capturedSnapshots[previous]!.content,
      this.capturedSnapshots[current]!.content
    );
  }
}
