import type { VoidComponent } from "solid-js";
import { Transition } from "../../src";
import { createSignal, Show } from "solid-js";

export type ToggleItemProps = {
  name?: string;
  enterDuration?: number;
  exitDuration?: number;
  show: boolean;
  appear?: boolean;
};

export const ToggleItemTransition: VoidComponent<ToggleItemProps> = props => {
  const [show, setShow] = createSignal(props.show);

  let transitionProps = {};
  if (props.name) {
    transitionProps = { name: props.name };
  } else {
    transitionProps = {
      enterActiveClass: `duration-${props.enterDuration} enter-active`,
      enterClass: "opacity-0 enter",
      enterToClass: "opacity-100 enter-to",
      exitActiveClass: `duration-${props.exitDuration} exit-active`,
      exitClass: "opacity-100 exit",
      exitToClass: "opacity-0 exit-to"
    };
  }

  return (
    <>
      <div data-testid="transition-container">
        <Transition {...transitionProps}>
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
