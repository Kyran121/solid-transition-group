import type { VoidComponent } from "solid-js";
import type { TransitionProps } from "../../src";
import { TransitionGroup } from "../../src";
import { createSignal, For, Show } from "solid-js";

export type ListProps = {
  name?: string;
  enterDuration?: number;
  exitDuration?: number;
  moveDuration?: number;
  svg?: boolean;
} & Pick<TransitionProps, "mode">;

export const ListTransition: VoidComponent<ListProps> = props => {
  let index = 4;

  const [list, setList] = createSignal<{ v: string }[]>([
    { v: "1" },
    { v: "2" },
    { v: "3" },
    { v: "4" }
  ]);

  return (
    <>
      <div data-testid="transition-container">
        <TransitionGroup
          name={props.name}
          enterActiveClass={`duration-${props.enterDuration} enter-active`}
          enterClass="opacity-0 enter"
          enterToClass="opacity-100 enter-to"
          exitActiveClass={`duration-${props.exitDuration} exit-active`}
          exitClass="opacity-100 exit"
          exitToClass="opacity-0 exit-to"
          moveClass={`duration-${props.moveDuration} move-active`}
        >
          <For each={list()}>
            {({ v }) => (
              <Show
                when={props.svg}
                fallback={
                  <div class={`value-${v}`}>
                    <span>{v}</span>
                  </div>
                }
              >
                <svg
                  class={`value-${v}`}
                  width="100"
                  height="100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
                </svg>
              </Show>
            )}
          </For>
        </TransitionGroup>
      </div>
      <button
        data-testid="remove-first-two"
        onClick={() => {
          setList(p => p.slice(2));
        }}
      >
        Remove
      </button>
      <button
        data-testid="append-two"
        onClick={() => {
          setList(p => [...p, { v: `${++index}` }, { v: `${++index}` }]);
        }}
      >
        Add
      </button>
    </>
  );
};
