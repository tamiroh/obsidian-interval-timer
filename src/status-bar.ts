import { Time } from "./time";
import {
	defaultLongBreakAfter,
	IntervalTimer,
	IntervalTimerState,
} from "./interval-timer";
import { TimerType } from "./countdown-timer";
import { Popover } from "./popover";
import { TimerDisplay } from "./timer-display";

const popoverFloatingClass = "interval-timer-status-bar-popover-floating";

export class StatusBar implements TimerDisplay {
	private readonly statusBarItem: HTMLElement;

	private readonly compact: HTMLSpanElement;

	private readonly compactIntervalCount: HTMLSpanElement;

	private readonly compactMinutes: Text;

	private readonly compactSeparator: HTMLSpanElement;

	private readonly compactSeconds: Text;

	private readonly popover: Popover;

	private handleCompactClick: ((event: MouseEvent) => void) | null = null;

	private handleCompactKeyDown: ((event: KeyboardEvent) => void) | null =
		null;

	constructor(
		statusBarElement: HTMLElement,
		callbacks: {
			notify: (message: string) => void;
			renderIcon: (element: HTMLElement, iconId: string) => void;
		},
	) {
		this.statusBarItem = statusBarElement;
		this.statusBarItem.classList.add("interval-timer-status-bar");
		this.statusBarItem.setAttribute("role", "timer");

		this.compact = this.statusBarItem.createSpan({
			cls: "interval-timer-status-bar-compact",
		});
		this.compact.dataset.testid = "status-bar-compact";
		this.compactIntervalCount = this.compact.createSpan({
			cls: "interval-timer-status-bar-compact-intervals",
		});
		const compactTime = this.compact.createSpan({
			cls: "interval-timer-status-bar-compact-time",
		});
		this.compactMinutes = document.createTextNode("");
		compactTime.append(this.compactMinutes);
		this.compactSeparator = compactTime.createSpan({
			cls: "interval-timer-status-bar-time-separator",
		});
		this.compactSeparator.dataset.testid = "status-bar-separator";
		this.compactSeparator.textContent = ":";
		this.compactSeconds = document.createTextNode("");
		compactTime.append(this.compactSeconds);

		this.popover = new Popover(this.statusBarItem, {
			getReturnTarget: () => {
				const bounds = this.statusBarItem.getBoundingClientRect();
				return {
					left: bounds.left + bounds.width / 2,
					top: bounds.top + bounds.height / 2,
				};
			},
			onFloatingChange: (floating) =>
				this.statusBarItem.classList.toggle(
					popoverFloatingClass,
					floating,
				),
			onRestoreFocus: () => {
				this.compact.focus({ preventScroll: true });
			},
			...callbacks,
		});
	}

	public update(
		intervals: { total: number; set: number },
		time: Time,
		intervalTimerState: IntervalTimerState,
		timerState: TimerType,
		longBreakAfter = defaultLongBreakAfter,
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
			"interval-timer-status-bar-time-separator-running",
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
		this.statusBarItem.classList.remove(popoverFloatingClass);
	}

	public enableClick(intervalTimer: IntervalTimer): void {
		this.statusBarItem.classList.add("mod-clickable");
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
