import { Time } from "./time";
import { IntervalTimer, IntervalTimerState } from "./interval-timer";
import { TimerType } from "./countdown-timer";

export type TimerDisplay = {
	update(
		intervals: { total: number; set: number },
		time: Time,
		intervalTimerState: IntervalTimerState,
		timerState: TimerType,
		longBreakAfter?: number,
	): void;
	updateTrackedTask(currentTaskName: string | null): void;
	updateLongBreakAfter(longBreakAfter: number): void;
	enableClick(intervalTimer: IntervalTimer): void;
	dispose(): void;
};
