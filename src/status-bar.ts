import { Time } from "./time";
import { IntervalTimer, IntervalTimerState } from "./interval-timer";
import { TimerType } from "./countdown-timer";
import { StatusBarPopover } from "./status-bar-popover";

export class StatusBar {
	private readonly statusBarItem: HTMLElement;

	private readonly compact: HTMLSpanElement;

	private readonly compactIntervalCount: HTMLSpanElement;

	private readonly compactMinutes: Text;

	private readonly compactSeparator: HTMLSpanElement;

	private readonly compactSeconds: Text;

	private readonly popover: StatusBarPopover;

	private handleCompactClick: ((event: MouseEvent) => void) | null = null;

	private handleCompactKeyDown: ((event: KeyboardEvent) => void) | null =
		null;

	constructor(statusBarElement: HTMLElement) {
		this.statusBarItem = statusBarElement;
		this.statusBarItem.classList.add("interval-timer-status-bar");
		this.statusBarItem.setAttribute("role", "timer");

		this.compact = this.statusBarItem.createSpan({
			cls: "interval-timer-status-bar-compact",
		});
		this.compactIntervalCount = this.compact.createSpan({
			cls: "interval-timer-compact-intervals",
		});
		const compactTime = this.compact.createSpan({
			cls: "interval-timer-compact-time",
		});
		this.compactMinutes = document.createTextNode("");
		compactTime.append(this.compactMinutes);
		this.compactSeparator = compactTime.createSpan({
			cls: "interval-timer-time-separator",
		});
		this.compactSeparator.textContent = ":";
		this.compactSeconds = document.createTextNode("");
		compactTime.append(this.compactSeconds);

		this.popover = new StatusBarPopover(this.statusBarItem);
	}

	public update(
		intervals: { total: number; set: number },
		time: Time,
		intervalTimerState: IntervalTimerState,
		timerState: TimerType,
		longBreakAfter = 4,
	): void {
		this.compactIntervalCount.textContent = `${intervals.set}/${intervals.total} `;
		this.compactMinutes.textContent = String(time.minutes).padStart(2, "0");
		this.compactSeconds.textContent = String(time.seconds).padStart(2, "0");
		this.popover.update(
			time,
			intervalTimerState,
			timerState,
			intervals.set,
			longBreakAfter,
		);
		this.compactSeparator.classList.toggle(
			"interval-timer-time-separator-running",
			timerState === "running",
		);
		this.statusBarItem.classList.toggle(
			"interval-timer-status-bar-focus",
			intervalTimerState === "focus",
		);
		this.statusBarItem.classList.toggle(
			"interval-timer-status-bar-break",
			intervalTimerState !== "focus",
		);
	}

	public updateTrackedTask(currentTaskName: string | null): void {
		this.popover.updateTrackedTask(currentTaskName);
	}

	public updateLongBreakAfter(longBreakAfter: number): void {
		this.popover.updateLongBreakAfter(longBreakAfter);
	}

	public dispose(): void {
		if (this.handleCompactClick) {
			this.compact.removeEventListener("click", this.handleCompactClick);
		}
		if (this.handleCompactKeyDown) {
			this.compact.removeEventListener(
				"keydown",
				this.handleCompactKeyDown,
			);
		}
		this.popover.dispose();
	}

	public enableClick(intervalTimer: IntervalTimer): void {
		this.compact.classList.add("mod-clickable");
		this.compact.setAttribute("role", "button");
		this.compact.tabIndex = 0;
		this.handleCompactClick = (event) => {
			if (event.button === 0) {
				intervalTimer.touch();
				this.compact.blur();
			}
		};
		this.handleCompactKeyDown = (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				intervalTimer.touch();
			}
		};
		this.compact.addEventListener("click", this.handleCompactClick);
		this.compact.addEventListener("keydown", this.handleCompactKeyDown);
		this.popover.enableActions(intervalTimer);
	}
}
