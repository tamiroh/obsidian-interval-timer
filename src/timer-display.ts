import { type Time } from "./time";
import { type IntervalTimer, type IntervalTimerState } from "./interval-timer";
import { type TimerState } from "./countdown-timer";

export type TimerDisplay = {
	update(
		intervals: { total: number; set: number },
		time: Time,
		intervalTimerState: IntervalTimerState,
		timerState: TimerState,
		longBreakAfter?: number,
	): void;
	updateTrackedTask(currentTaskName: string | null): void;
	updateLongBreakAfter(longBreakAfter: number): void;
	enableClick(intervalTimer: IntervalTimer): void;
	dispose(): void;
};
