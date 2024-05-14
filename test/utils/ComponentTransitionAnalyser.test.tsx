import type { Component } from "solid-js";
import type { TransitionComponent, TransitionTrigger } from "./ComponentTransitionAnalyser";
import type {
  ListTransitionProps,
  SwitchTransitionProps,
  ToggleTransitionProps,
  TransitionClasses,
  TransitionDurations,
  TransitionName
} from "./TransitionTypes";
import { describe, it } from "vitest";
import { createSignal, Show, For } from "solid-js";
import { Transition, TransitionGroup } from "../../src";
import ComponentTransitionAnalyser from "./ComponentTransitionAnalyser";
import { fireEvent } from "@solidjs/testing-library";
import "./ComponentTransitionAnalyser.css";

describe.concurrent("ComponentTransitionAnalyser", () => {
  describe("analyseTransitionActivity", () => {
    it("throws error when transitioning element is missing duration (entering transition)", async ({
      expect
    }) => {
      const TransitionComponent = createTransitionComponent({
        show: false,
        enterDuration: 9999
      });

      const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
      componentTransitionAnalyser.addTransitionTrigger(clickToggleButtonWaitingDuration(75));

      expect(componentTransitionAnalyser.analyseTransitionActivity()).rejects.toThrow(
        "Unable to find any transitioning elements at parent level"
      );
    });

    it("throws error when transition fails to take specified amount of time", async ({
      expect
    }) => {
      const enterDuration = 150;

      const TransitionComponent = createTransitionComponent({
        show: false,
        enterDuration: 75
      });

      const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
      componentTransitionAnalyser.addTransitionTrigger(
        clickToggleButtonWaitingDuration(enterDuration)
      );

      expect(componentTransitionAnalyser.analyseTransitionActivity()).rejects.toThrow(
        `Transition #1 failed to take at least ${enterDuration}ms`
      );
    });

    it("correctly analyses activity for an element which enters", async ({ expect }) => {
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

    it("correctly analyses activity for an element which exits", async ({ expect }) => {
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

    it("correctly analyses activity for element which enters and exits", async ({ expect }) => {
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

    it("correctly analyses activity for an old element exiting followed by a new element entering (out-in)", async ({
      expect
    }) => {
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

    it("correctly analyses activity for a new element entering followed by an old element exiting (in-out)", async ({
      expect
    }) => {
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

    it("correctly analyses activity for a new element entering and old element exiting at the same time (same duration)", async ({
      expect
    }) => {
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

    it("correctly analyses activity for a new element entering and old element exiting at the same time (different durations)", async ({
      expect
    }) => {
      const enterDuration = 75;
      const exitDuration = 100;

      const TransitionComponent = createSwitchTransitionComponent({
        enterDuration,
        exitDuration
      });

      const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
      componentTransitionAnalyser.addTransitionTrigger(
        clickNextButtonWaitingDuration(Math.max(enterDuration, exitDuration))
      );

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });

    it("correctly analyses activity for a list of elements which enter and exit", async ({ expect }) => {
      const duration = 75;

      const TransitionComponent = createListTransitionElement({
        enterDuration: duration,
        exitDuration: duration
      });

      const componentTransitionAnalyser = new ComponentTransitionAnalyser(TransitionComponent);
      componentTransitionAnalyser.addTransitionTrigger(clickAddButtonWaitingDuration(duration));
      componentTransitionAnalyser.addTransitionTrigger(clickRemoveButtonWaitingDuration(duration));
      componentTransitionAnalyser.addTransitionTrigger(
        clickAddRemoveButtonWaitingDuration(duration)
      );

      const activityReport = await componentTransitionAnalyser.analyseTransitionActivity();
      expect(activityReport).toMatchSnapshot();
    });

    function createTransitionComponent(props: ToggleTransitionProps): Component {
      return () => {
        const [show, setShow] = createSignal(props.show);

        return (
          <>
            <div data-testid="transition-container">
              <Transition
                enterActiveClass={`duration-${props.enterDuration} enter-active`}
                enterClass="opacity-0 enter"
                enterToClass="opacity-100 enter-to"
                exitActiveClass={`duration-${props.exitDuration} exit-active`}
                exitClass="opacity-100 exit"
                exitToClass="opacity-0 exit-to"
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

    function createListTransitionElement(props: ListTransitionProps): Component {
      return () => {
        let index = 4;

        const [list, setList] = createSignal<{ v: string }[]>([
          { v: "1" },
          { v: "2" },
          { v: "3" },
          { v: "4" }
        ]);
        const classProps = createClassProps(props);

        return (
          <>
            <div data-testid="transition-container">
              <TransitionGroup name={props.name} {...classProps}>
                <For each={list()}>
                  {({ v }) => (
                    <div class={`value-${v}`}>
                      <span>{v}</span>
                    </div>
                  )}
                </For>
              </TransitionGroup>
            </div>
            <button
              data-testid="remove"
              onClick={() => {
                setList(p => p.slice(2));
              }}
            >
              Remove
            </button>
            <button
              data-testid="add"
              onClick={() => {
                setList(p => [...p, { v: `${++index}` }, { v: `${++index}` }]);
              }}
            >
              Add
            </button>
            <button
              data-testid="add-remove"
              onClick={() => {
                setList(p => [...p.slice(2), { v: `${++index}` }, { v: `${++index}` }]);
              }}
            >
              Add & Remove
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

    function clickNextButtonWaitingDuration(expectedDuration: number): TransitionTrigger {
      const execute = (tools: TransitionComponent) => fireEvent.click(tools.getByTestId("next"));
      return { execute, expectedDuration };
    }

    function clickToggleButtonWaitingDuration(expectedDuration: number): TransitionTrigger {
      const execute = (tools: TransitionComponent) => fireEvent.click(tools.getByTestId("toggle"));
      return { execute, expectedDuration };
    }

    function clickAddButtonWaitingDuration(expectedDuration: number): TransitionTrigger {
      const execute = (tools: TransitionComponent) => fireEvent.click(tools.getByTestId("add"));
      return { execute, expectedDuration };
    }

    function clickRemoveButtonWaitingDuration(expectedDuration: number): TransitionTrigger {
      const execute = (tools: TransitionComponent) => fireEvent.click(tools.getByTestId("remove"));
      return { execute, expectedDuration };
    }

    function clickAddRemoveButtonWaitingDuration(expectedDuration: number): TransitionTrigger {
      const execute = (tools: TransitionComponent) =>
        fireEvent.click(tools.getByTestId("add-remove"));
      return { execute, expectedDuration };
    }
  });
});
