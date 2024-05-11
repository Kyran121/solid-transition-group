import { Show } from "solid-js";
import { describe, expect, test, it, vi } from "vitest";
import { Transition, type TransitionEvents } from "../src";
import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal, type Component } from "solid-js";
import { formatHTML } from "./utils/HTMLFormatter";
import ComponentTransitionAnalyser, {
  type TransitionComponent
} from "./utils/ComponentTransitionAnalyser";
import "./index.css";

const TRANSITION_CONTAINER_ID = "transition-container";

type EventHandler = (...args: any[]) => void;

type TransitionComponentProps = {
  show?: boolean;
  appear?: boolean;
  enterDuration?: number;
  exitDuration?: number;
  events?: TransitionEvents;
};

describe("Transition", () => {
  describe("Setup", () => {
    test("transition element immediately shown when show=true", () => {
      const { getByTestId } = render(createTransitionComponent({ show: true }) as any);
      expect(formatHTML(getByTestId(TRANSITION_CONTAINER_ID).innerHTML)).toMatchSnapshot();
    });

    test("transition element immediately hidden when show=false", () => {
      const { getByTestId } = render(createTransitionComponent({ show: false }) as any);
      expect(formatHTML(getByTestId(TRANSITION_CONTAINER_ID).innerHTML)).toMatchSnapshot();
    });

    test("'base' and 'from' classes applied immediately to transition element when show=true and appear=true", () => {
      const { getByTestId } = render(
        createTransitionComponent({
          show: true,
          appear: true
        }) as any
      );
      expect(formatHTML(getByTestId(TRANSITION_CONTAINER_ID).innerHTML)).toMatchSnapshot();
    });
  });

  describe("Shallow Transitions", () => {
    it("should transition in completely", async () => {
      const enterDuration = 75;

      const TransitionComponent = createTransitionComponent({
        show: false,
        enterDuration
      });

      const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
      componentTransitionAnalyser.addTransitionTrigger(addToggleButtonTrigger(enterDuration));

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });

    it("should transition out completely", async () => {
      const exitDuration = 75;

      const TransitionComponent = createTransitionComponent({
        show: true,
        exitDuration
      });

      const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
      componentTransitionAnalyser.addTransitionTrigger(addToggleButtonTrigger(exitDuration));

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });

    it("should transition in and out completely", async () => {
      const enterDuration = 75;
      const exitDuration = 100;

      const TransitionComponent = createTransitionComponent({
        show: false,
        enterDuration,
        exitDuration
      });

      const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
      componentTransitionAnalyser.addTransitionTrigger(addToggleButtonTrigger(enterDuration));
      componentTransitionAnalyser.addTransitionTrigger(addToggleButtonTrigger(exitDuration));

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });
  });

  describe("Events", () => {
    it("should fire events for all the stages", async () => {
      const eventHandler = vi.fn();
      const callEventHandler = (type: keyof TransitionEvents) => () =>
        eventHandler(type, Date.now());

      const enterDuration = 75;
      const exitDuration = 100;

      const TransitionComponent = createTransitionComponent({
        show: false,
        enterDuration,
        exitDuration,
        events: {
          onBeforeEnter: callEventHandler("onBeforeEnter"),
          onEnter: callEventHandler("onEnter"),
          onAfterEnter: callEventHandler("onAfterEnter"),
          onBeforeExit: callEventHandler("onBeforeExit"),
          onExit: callEventHandler("onExit"),
          onAfterExit: callEventHandler("onAfterExit")
        }
      });

      const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
      componentTransitionAnalyser.addTransitionTrigger(addToggleButtonTrigger(enterDuration));
      componentTransitionAnalyser.addTransitionTrigger(addToggleButtonTrigger(exitDuration));

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

  function createTransitionComponent({
    enterDuration = 75,
    exitDuration = 100,
    show: shown = true,
    appear = false,
    events = {}
  }: TransitionComponentProps): Component {
    return () => {
      const [show, setShow] = createSignal(shown);
      const handleEvent = createEventHandler(events);

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
              enterActiveClass={`duration-${enterDuration}`}
              enterClass="opacity-0"
              enterToClass="opacity-100"
              exitActiveClass={`duration-${exitDuration}`}
              exitClass="opacity-100"
              exitToClass="opacity-0"
              appear={appear}
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

  function addToggleButtonTrigger(expectedDuration: number) {
    const execute = (tools: TransitionComponent) => fireEvent.click(tools.getByTestId("toggle"));
    return { execute, expectedDuration };
  }
});
