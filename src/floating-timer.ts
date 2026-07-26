import { App, EventRef } from "obsidian";
import { Time } from "./time";
import { IntervalTimer, IntervalTimerState } from "./interval-timer";
import { TimerType } from "./countdown-timer";
import { Popover } from "./popover";
import { defaultPluginSetting } from "./plugin-setting";

export class FloatingTimer {
	private readonly containerEl: HTMLElement;

	private readonly popover: Popover;

	private readonly activeLeafChangeRef: EventRef;

	constructor(private readonly app: App) {
		this.containerEl = createDiv({ cls: "interval-timer-floating-timer" });
		this.mountToActiveLeaf();

		this.activeLeafChangeRef = this.app.workspace.on(
			"active-leaf-change",
			() => this.mountToActiveLeaf(),
		);

		this.popover = new Popover(this.containerEl, {
			getReturnTarget: () => {
				const bounds = this.containerEl.getBoundingClientRect();
				return {
					left: bounds.left + bounds.width / 2,
					top: bounds.top + bounds.height / 2,
				};
			},
			onFloatingChange: () => {},
			onRestoreFocus: () => {},
			floatOnMount: true,
			dismissible: false,
		});
	}

	private mountToActiveLeaf(): void {
		const leafContainer =
			this.app.workspace.getMostRecentLeaf()?.view.containerEl ??
			document.body;
		if (this.containerEl.parentElement !== leafContainer) {
			leafContainer.append(this.containerEl);
		}
	}

	public update(
		intervals: { total: number; set: number },
		time: Time,
		intervalTimerState: IntervalTimerState,
		timerState: TimerType,
		longBreakAfter = defaultPluginSetting.longBreakAfter,
	): void {
		this.popover.update(
			time,
			intervalTimerState,
			timerState,
			intervals.set,
			longBreakAfter,
		);
	}

	public updateTrackedTask(currentTaskName: string | null): void {
		this.popover.updateTrackedTask(currentTaskName);
	}

	public updateLongBreakAfter(longBreakAfter: number): void {
		this.popover.updateLongBreakAfter(longBreakAfter);
	}

	public enableClick(intervalTimer: IntervalTimer): void {
		this.popover.enableActions(intervalTimer);
	}

	public dispose(): void {
		this.app.workspace.offref(this.activeLeafChangeRef);
		this.popover.dispose();
		this.containerEl.remove();
	}
}
