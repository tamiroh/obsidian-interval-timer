import type { Plugin as BasePlugin } from "obsidian";
import type { IntervalTimer } from "./interval-timer";

export const registerCommands = (
	plugin: BasePlugin,
	intervalTimer: IntervalTimer,
): void => {
	plugin.addCommand({
		id: "start-timer",
		name: "Start timer",
		checkCallback: (checking) => {
			const canStart = intervalTimer.canStart;
			if (!checking && canStart) intervalTimer.start();
			return canStart;
		},
	});
	plugin.addCommand({
		id: "pause-timer",
		name: "Pause timer",
		checkCallback: (checking) => {
			const canPause = intervalTimer.canPause;
			if (!checking && canPause) intervalTimer.pause();
			return canPause;
		},
	});
	plugin.addCommand({
		id: "reset-timer",
		name: "Reset timer",
		callback: () => {
			intervalTimer.reset();
		},
	});
	plugin.addCommand({
		id: "reset-intervals-set",
		name: "Reset intervals set",
		callback: () => {
			intervalTimer.resetIntervalsSet();
		},
	});
	plugin.addCommand({
		id: "reset-total-intervals",
		name: "Reset total intervals",
		callback: () => {
			intervalTimer.resetTotalIntervals();
		},
	});
	plugin.addCommand({
		id: "skip-interval",
		name: "Skip interval",
		checkCallback: (checking) => {
			const { canSkip } = intervalTimer;
			if (!checking && canSkip) intervalTimer.skipInterval();
			return canSkip;
		},
	});
};
