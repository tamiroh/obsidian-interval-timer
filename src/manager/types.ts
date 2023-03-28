import { TimerType } from "../timer/types";
import { Time } from "../time/time";

export type IntervalTimerState = "focus" | "break";

export type onChangeStateFunction = (
	timerState: TimerType,
	intervalTimerState: IntervalTimerState,
	time: Time
) => void;
