import type { VoidComponent } from "solid-js";
import type { TransitionProps } from "../../src";
import { Transition } from "../../src";
import { createSignal, Show } from "solid-js";

export type SwitchItemProps = {
  name?: string;
  enterDuration?: number;
  exitDuration?: number;
} & Pick<TransitionProps, "mode">;

export const SwitchItemTransition: VoidComponent<SwitchItemProps> = props => {
  const [page, setPage] = createSignal(1);

  return (
    <>
      <div data-testid="transition-container">
        <Transition
          name={props.name}
          enterActiveClass={`duration-${props.enterDuration} enter-active`}
          enterClass="opacity-0 enter"
          enterToClass="opacity-100 enter-to"
          exitActiveClass={`duration-${props.exitDuration} exit-active`}
          exitClass="opacity-100 exit"
          exitToClass="opacity-0 exit-to"
          mode={props.mode}
        >
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
