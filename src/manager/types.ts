import { Time } from "../types/time";
import { TimerType } from "../countdownTimer";

export type IntervalTimerState = "focus" | "shortBreak" | "longBreak";

export type onChangeStateFunction = (
	timerState: TimerType,
	intervalTimerState: IntervalTimerState,
	time: Time,
	focusIntervals: { total: number; set: number },
) => void;
