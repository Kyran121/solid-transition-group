import type { Component } from "solid-js";
import type { TransitionEvents } from "../src";
import type { TransitionComponent, TransitionTrigger } from "./utils/ComponentTransitionAnalyser";
import type {
  SwitchTransitionProps,
  ToggleTransitionProps,
  TransitionClasses,
  TransitionDurations,
  TransitionName
} from "./utils/TransitionTypes";
import { Show, Suspense, createRenderEffect, createResource, untrack } from "solid-js";
import { describe, test, it, vi } from "vitest";
import { Transition } from "../src";
import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { formatHTML } from "./utils/HTMLFormatter";
import ComponentTransitionAnalyser from "./utils/ComponentTransitionAnalyser";
import "./index.css";

const TRANSITION_CONTAINER_ID = "transition-container";

type EventHandler = (...args: any[]) => void;

describe.concurrent("Transition", () => {
  describe("Setup", () => {
    test("transition element immediately shown when show=true", async ({ expect }) => {
      const { getByTestId } = render(createTransitionComponent({ show: true }) as any);
      expect(formatHTML(getByTestId(TRANSITION_CONTAINER_ID).innerHTML)).toMatchSnapshot();
    });

    test("transition element immediately hidden when show=false", async ({ expect }) => {
      const { getByTestId } = render(createTransitionComponent({ show: false }) as any);
      expect(formatHTML(getByTestId(TRANSITION_CONTAINER_ID).innerHTML)).toMatchSnapshot();
    });

    test("'base' and 'from' classes applied immediately to transition element when show=true and appear=true", async ({
      expect
    }) => {
      const { getByTestId } = render(
        createTransitionComponent({
          show: true,
          appear: true,
          enterDuration: 75
        }) as any
      );
      expect(formatHTML(getByTestId(TRANSITION_CONTAINER_ID).innerHTML)).toMatchSnapshot();
    });
  });

  describe("Shallow Transitions", () => {
    describe("Toggle", () => {
      it("should transition in completely", async ({ expect }) => {
        const enterDuration = 75;

        const TransitionComponent = createTransitionComponent({
          show: false,
          enterDuration
        });

        const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
        componentTransitionAnalyser.addTransitionTrigger(
          clickToggleButtonWaitingDuration(enterDuration)
        );

        const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
        expect(activityReport).toMatchSnapshot();
      });

      it("should transition in completely (generated classes)", async ({ expect }) => {
        const enterDuration = 75;

        const TransitionComponent = createTransitionComponent({
          show: false,
          name: "transitionElement"
        });

        const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
        componentTransitionAnalyser.addTransitionTrigger(
          clickToggleButtonWaitingDuration(enterDuration)
        );

        const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
        expect(activityReport).toMatchSnapshot();
      });

      it("should transition out completely", async ({ expect }) => {
        const exitDuration = 75;

        const TransitionComponent = createTransitionComponent({
          show: true,
          exitDuration
        });

        const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
        componentTransitionAnalyser.addTransitionTrigger(
          clickToggleButtonWaitingDuration(exitDuration)
        );

        const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
        expect(activityReport).toMatchSnapshot();
      });

      it("should transition out completely (generated classes)", async ({ expect }) => {
        const exitDuration = 75;

        const TransitionComponent = createTransitionComponent({
          show: true,
          name: "transitionElement"
        });

        const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
        componentTransitionAnalyser.addTransitionTrigger(
          clickToggleButtonWaitingDuration(exitDuration)
        );

        const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
        expect(activityReport).toMatchSnapshot();
      });

      it("should transition in and out completely", async ({ expect }) => {
        const enterDuration = 75;
        const exitDuration = 100;

        const TransitionComponent = createTransitionComponent({
          show: false,
          enterDuration,
          exitDuration
        });

        const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
        componentTransitionAnalyser.addTransitionTrigger(
          clickToggleButtonWaitingDuration(enterDuration)
        );
        componentTransitionAnalyser.addTransitionTrigger(
          clickToggleButtonWaitingDuration(exitDuration)
        );

        const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
        expect(activityReport).toMatchSnapshot();
      });

      it("should transition in and out completely (generated classes)", async ({ expect }) => {
        const enterDuration = 75;
        const exitDuration = 100;

        const TransitionComponent = createTransitionComponent({
          show: false,
          name: "transitionElement"
        });

        const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
        componentTransitionAnalyser.addTransitionTrigger(
          clickToggleButtonWaitingDuration(enterDuration)
        );
        componentTransitionAnalyser.addTransitionTrigger(
          clickToggleButtonWaitingDuration(exitDuration)
        );

        const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
        expect(activityReport).toMatchSnapshot();
      });
    });

    describe("Switch", () => {
      it("should transition out old element followed by transitioning new element in (out-in)", async ({ expect }) => {
        const enterDuration = 75;
        const exitDuration = 100;
        const mode = "outin";

        const TransitionComponent = createSwitchTransitionComponent({
          enterDuration,
          exitDuration,
          mode
        });

        const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
        componentTransitionAnalyser.addTransitionTrigger(
          clickNextButtonWaitingDuration(exitDuration)
        );
        componentTransitionAnalyser.expectFollowUpTransition(enterDuration);

        const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
        expect(activityReport).toMatchSnapshot();
      });

      it("should transition in new element followed by transitioning old element out (in-out)", async ({ expect }) => {
        const enterDuration = 75;
        const exitDuration = 100;
        const mode = "inout";

        const TransitionComponent = createSwitchTransitionComponent({
          enterDuration,
          exitDuration,
          mode
        });

        const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
        componentTransitionAnalyser.addTransitionTrigger(
          clickNextButtonWaitingDuration(enterDuration)
        );
        componentTransitionAnalyser.expectFollowUpTransition(exitDuration);

        const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
        expect(activityReport).toMatchSnapshot();
      });

      describe("should transition in new element and transition out old element at the same time (parallel)", () => {
        test("case 1: durations are the same", async ({ expect }) => {
          const duration = 75;

          const TransitionComponent = createSwitchTransitionComponent({
            enterDuration: duration,
            exitDuration: duration
          });

          const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
          componentTransitionAnalyser.addTransitionTrigger(clickNextButtonWaitingDuration(duration));

          const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
          expect(activityReport).toMatchSnapshot();
        });
        test("case 2: durations are different", async ({ expect }) => {
          const enterDuration = 75;
          const exitDuration = 100;
       
          const TransitionComponent = createSwitchTransitionComponent({
            enterDuration,
            exitDuration
          });

          const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
          componentTransitionAnalyser.addTransitionTrigger(clickNextButtonWaitingDuration(Math.max(enterDuration, exitDuration)));

          const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
          expect(activityReport).toMatchSnapshot();
        });
      });
    });
  });

  describe("Events", () => {
    it("should fire events for all the stages", async ({ expect }) => {
      const eventHandler = vi.fn();
      const callEventHandler = (type: keyof TransitionEvents) => () =>
        eventHandler(type, Date.now());

      const enterDuration = 75;
      const exitDuration = 100;

      const TransitionComponent = createTransitionComponent({
        show: false,
        enterDuration,
        exitDuration,
        onBeforeEnter: callEventHandler("onBeforeEnter"),
        onEnter: callEventHandler("onEnter"),
        onAfterEnter: callEventHandler("onAfterEnter"),
        onBeforeExit: callEventHandler("onBeforeExit"),
        onExit: callEventHandler("onExit"),
        onAfterExit: callEventHandler("onAfterExit")
      });

      const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
      componentTransitionAnalyser.addTransitionTrigger(
        clickToggleButtonWaitingDuration(enterDuration)
      );
      componentTransitionAnalyser.addTransitionTrigger(
        clickToggleButtonWaitingDuration(exitDuration)
      );

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();

      expect(eventHandler).toHaveBeenCalledTimes(6);
      expect(eventHandler.mock.calls.map(([name]) => name)).toEqual([
        // Order is important here
        "onBeforeEnter",
        "onEnter",
        "onAfterEnter",
        "onBeforeExit",
        "onExit",
        "onAfterExit"
      ]);

      const enterHookDiff = eventHandler.mock.calls[2][1] - eventHandler.mock.calls[0][1];
      expect(enterHookDiff).toBeGreaterThanOrEqual(enterDuration);
      expect(enterHookDiff).toBeLessThanOrEqual(enterDuration * 3);

      const exitHookDiff = eventHandler.mock.calls[5][1] - eventHandler.mock.calls[3][1];
      expect(exitHookDiff).toBeGreaterThanOrEqual(exitDuration);
      expect(exitHookDiff).toBeLessThanOrEqual(exitDuration * 3);
    });
  });

  const noopEventHandler = () => {};

  const createEventHandler =
    (events: TransitionEvents) =>
    (type: keyof TransitionEvents) =>
    (...args: any[]) =>
      ((events[type] as EventHandler) ?? noopEventHandler)(...args);

  function createTransitionComponent(props: ToggleTransitionProps): Component {
    return () => {
      const [show, setShow] = createSignal(props.show);
      const handleEvent = createEventHandler(props);
      const classProps = createClassProps(props);

      return (
        <>
          <div data-testid="transition-container">
            <Transition
              onBeforeEnter={handleEvent("onBeforeEnter")}
              onEnter={handleEvent("onEnter")}
              onAfterEnter={handleEvent("onAfterEnter")}
              onBeforeExit={handleEvent("onBeforeExit")}
              onExit={handleEvent("onExit")}
              onAfterExit={handleEvent("onAfterExit")}
              name={props.name}
              appear={props.appear}
              {...classProps}
            >
              <Show when={show()}>
                <div>
                  <span>Hello!</span>
                </div>
              </Show>
            </Transition>
          </div>
          <button data-testid="toggle" onClick={() => setShow(!show())}>
            Toggle
          </button>
        </>
      );
    };
  }

  function createSwitchTransitionComponent(props: SwitchTransitionProps): Component {
    return () => {
      const [page, setPage] = createSignal(1);
      const classProps = createClassProps(props);

      return (
        <>
          <div data-testid="transition-container">
            <Transition name={props.name} mode={props.mode} {...classProps}>
              <Show when={page()} keyed>
                {i => <div>{i}</div>}
              </Show>
            </Transition>
          </div>
          <button data-testid="next" onClick={() => setPage(page => ++page)}>
            Next
          </button>
        </>
      );
    };
  }

  function createClassProps(props: TransitionName & TransitionDurations): TransitionClasses {
    if (props.name) {
      return {};
    }
    return {
      enterActiveClass: `duration-${props.enterDuration} enter-active`,
      enterClass: "opacity-0 enter",
      enterToClass: "opacity-100 enter-to",
      exitActiveClass: `duration-${props.exitDuration} exit-active`,
      exitClass: "opacity-100 exit",
      exitToClass: "opacity-0 exit-to"
    };
  }

  function clickToggleButtonWaitingDuration(expectedDuration: number): TransitionTrigger {
    const execute = (tools: TransitionComponent) => fireEvent.click(tools.getByTestId("toggle"));
    return { execute, expectedDuration };
  }

  function clickNextButtonWaitingDuration(expectedDuration: number): TransitionTrigger {
    const execute = (tools: TransitionComponent) => fireEvent.click(tools.getByTestId("next"));
    return { execute, expectedDuration };
  }
});
