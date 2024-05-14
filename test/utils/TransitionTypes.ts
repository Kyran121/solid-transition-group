import type { TransitionEvents, TransitionProps } from "../../src";

export type TransitionName = { name?: string };
export type TransitionDurations = {
  enterDuration?: number;
  exitDuration?: number;
};
export type ToggleTransitionProps = TransitionEvents &
  TransitionName &
  TransitionDurations & {
    show: boolean;
    appear?: boolean;
    suspend?: boolean;
  };
export type SwitchTransitionProps = TransitionName &
  TransitionDurations &
  Pick<TransitionProps, "mode">;
export type ListTransitionProps = Omit<ToggleTransitionProps, "show">;

export type TransitionClasses = Pick<
  TransitionProps,
  | "enterActiveClass"
  | "enterClass"
  | "enterToClass"
  | "exitActiveClass"
  | "exitClass"
  | "exitToClass"
>;
