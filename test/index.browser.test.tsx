import type {
  TransitionComponent,
  TransitionTrigger
} from "./test-utils/ComponentTransitionAnalyser";
import { describe, it } from "vitest";
import ComponentTransitionAnalyser from "./test-utils/ComponentTransitionAnalyser";
import { fireEvent, render } from "@solidjs/testing-library";
import { ToggleItemTransition } from "./test-components/ToggleItemTransition";
import { SwitchItemTransition } from "./test-components/SwitchItemTransition";
import { ListTransition } from "./test-components/ListTransition";
import "./index.browser.css";

describe("Transition", () => {
  describe("toggle scenarios", () => {
    it("correctly analyses activity for an element which enters", async ({ expect }) => {
      const enterDuration = 75;
      const transitioningComponent = render(() => (
        <ToggleItemTransition show={false} enterDuration={enterDuration} />
      ));
      const componentTransitionAnalyser = new ComponentTransitionAnalyser(
        transitioningComponent
      ).addTransitionTrigger(clickButtonWithTestIdWaitingDuration("toggle", enterDuration));

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });

    it("correctly analyses activity for an element which exits", async ({ expect }) => {
      const exitDuration = 75;
      const transitioningComponent = render(() => (
        <ToggleItemTransition show={true} exitDuration={exitDuration} />
      ));
      const componentTransitionAnalyser = new ComponentTransitionAnalyser(
        transitioningComponent
      ).addTransitionTrigger(clickButtonWithTestIdWaitingDuration("toggle", exitDuration));

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });

    it("correctly analyses activity for element which enters and exits", async ({ expect }) => {
      const enterDuration = 75;
      const exitDuration = 100;
      const transitioningComponent = render(() => (
        <ToggleItemTransition
          show={false}
          enterDuration={enterDuration}
          exitDuration={exitDuration}
        />
      ));
      const componentTransitionAnalyser = new ComponentTransitionAnalyser(transitioningComponent)
        .addTransitionTrigger(clickButtonWithTestIdWaitingDuration("toggle", enterDuration))
        .addTransitionTrigger(clickButtonWithTestIdWaitingDuration("toggle", exitDuration));

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });
  });

  describe("switch scenarios", () => {
    it("correctly analyses activity for an old element exiting followed by a new element entering (out-in)", async ({
      expect
    }) => {
      const enterDuration = 75;
      const exitDuration = 100;
      const mode = "outin";
      const transitioningComponent = render(() => (
        <SwitchItemTransition
          enterDuration={enterDuration}
          exitDuration={exitDuration}
          mode={mode}
        />
      ));
      const componentTransitionAnalyser = new ComponentTransitionAnalyser(transitioningComponent)
        .addTransitionTrigger(clickButtonWithTestIdWaitingDuration("next", exitDuration))
        .expectFollowUpTransition(enterDuration);

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });

    it("correctly analyses activity for a new element entering followed by an old element exiting (in-out)", async ({
      expect
    }) => {
      const enterDuration = 75;
      const exitDuration = 100;
      const mode = "inout";
      const transitioningComponent = render(() => (
        <SwitchItemTransition
          enterDuration={enterDuration}
          exitDuration={exitDuration}
          mode={mode}
        />
      ));
      const componentTransitionAnalyser = new ComponentTransitionAnalyser(transitioningComponent)
        .addTransitionTrigger(clickButtonWithTestIdWaitingDuration("next", enterDuration))
        .expectFollowUpTransition(exitDuration);

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });

    it("correctly analyses activity for a new element entering and old element exiting at the same time (same duration)", async ({
      expect
    }) => {
      const duration = 75;
      const transitioningComponent = render(() => (
        <SwitchItemTransition enterDuration={duration} exitDuration={duration} />
      ));
      const componentTransitionAnalyser = new ComponentTransitionAnalyser(
        transitioningComponent
      ).addTransitionTrigger(clickButtonWithTestIdWaitingDuration("next", duration));

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });
  });
});

describe("TransitionGroup", () => {
  it("correctly analyses activity for a list of elements added and removed", async ({ expect }) => {
    const duration = 75;
    const moveDuration = 150;
    const transitioningComponent = render(() => (
      <ListTransition
        enterDuration={duration}
        exitDuration={duration}
        moveDuration={moveDuration}
      />
    ));
    const componentTransitionAnalyser = new ComponentTransitionAnalyser(transitioningComponent)
      .addTransitionTrigger(clickButtonWithTestIdWaitingDuration("append-two", duration))
      .addTransitionTrigger(clickButtonWithTestIdWaitingDuration("remove-first-two", duration))
      .expectFollowUpTransition(moveDuration);

    const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
    expect(activityReport).toMatchSnapshot();
  });

  it("correctly analyses activity for a list of svgs added and removed", async ({ expect }) => {
    const duration = 75;
    const moveDuration = 150;
    const transitioningComponent = render(() => (
      <ListTransition
        enterDuration={duration}
        exitDuration={duration}
        moveDuration={moveDuration}
        svg={true}
      />
    ));
    const componentTransitionAnalyser = new ComponentTransitionAnalyser(transitioningComponent)
      .addTransitionTrigger(clickButtonWithTestIdWaitingDuration("append-two", duration))
      .addTransitionTrigger(clickButtonWithTestIdWaitingDuration("remove-first-two", duration))
      .expectFollowUpTransition(moveDuration);

    const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
    expect(activityReport).toMatchSnapshot();
  });
});

function clickButtonWithTestIdWaitingDuration(
  testId: string,
  expectedDuration: number
): TransitionTrigger {
  const execute = (tools: TransitionComponent) => fireEvent.click(tools.getByTestId(testId));
  return { execute, expectedDuration };
}
