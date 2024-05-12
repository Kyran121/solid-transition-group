import { describe, it } from "vitest";
import { createSignal, Show, type Component } from "solid-js";
import { Transition } from "../../src";
import ComponentTransitionAnalyser, {
  type TransitionComponent
} from "./ComponentTransitionAnalyser";
import { fireEvent } from "@solidjs/testing-library";
import "./ComponentTransitionAnalyser.css";

type TransitionProps = {
  show?: boolean;
  enterDuration?: number;
  exitDuration?: number;
};

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
        "Unable to extract transitionDuration style from transition container child!"
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

    it("correctly analyses activity for an element which leaves", async ({ expect }) => {
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

    it("correctly analyses activity for element which enters and leaves", async ({ expect }) => {
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

    function createTransitionComponent(props: TransitionProps): Component {
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

    function clickToggleButtonWaitingDuration(expectedDuration: number) {
      const execute = (tools: TransitionComponent) => fireEvent.click(tools.getByTestId("toggle"));
      return { execute, expectedDuration };
    }
  });
});
