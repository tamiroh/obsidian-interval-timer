import { TimerType } from "../timer/types";
import { Time } from "../time/time";

export type IntervalTimerState = "focus" | "shortBreak" | "longBreak";

export type onChangeStateFunction = (
	timerState: TimerType,
	intervalTimerState: IntervalTimerState,
	time: Time
) => void;
