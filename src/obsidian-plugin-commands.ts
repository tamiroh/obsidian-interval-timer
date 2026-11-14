import type { Plugin as BasePlugin } from "obsidian";
import type { IntervalTimer } from "./interval-timer";
import type { EventStore } from "./event-store";
import type { IntervalTimerEventRecord } from "./interval-timer-event-record";
import { TaskEventModal } from "./obsidian-task-event-modal";
import type { TaskTracker } from "./obsidian-task-tracker";

export const registerCommands = (
	plugin: BasePlugin,
	intervalTimer: IntervalTimer,
	taskTracker: TaskTracker,
	eventStore: EventStore<IntervalTimerEventRecord>,
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
	plugin.addCommand({
		id: "view-task-events",
		name: "View task events",
		checkCallback: (checking) => {
			const task = taskTracker.getTaskReferenceFromActiveLine();
			if (task === null) return false;
			if (!checking) {
				new TaskEventModal(plugin.app, task, eventStore).open();
			}
			return true;
		},
	});
};
