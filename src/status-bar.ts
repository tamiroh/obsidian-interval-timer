import { App, Menu, setTooltip } from "obsidian";
import { Time } from "./time";
import { IntervalTimer, IntervalTimerState } from "./interval-timer";
import { RetimeModal } from "./retime-modal";
import { TimerType } from "./countdown-timer";

export class StatusBar {
	private statusBarItem: HTMLElement;

	private app: App;

	private intervalCount: Text;

	private minutes: Text;

	private separator: HTMLSpanElement;

	private seconds: Text;

	constructor(statusBarElement: HTMLElement, app: App) {
		this.statusBarItem = statusBarElement;
		this.app = app;
		this.intervalCount = document.createTextNode("");
		this.minutes = document.createTextNode("");
		this.statusBarItem.append(this.intervalCount, this.minutes);
		this.separator = this.statusBarItem.createSpan({
			cls: "interval-timer-time-separator",
		});
		this.separator.textContent = ":";
		this.seconds = document.createTextNode("");
		this.statusBarItem.append(this.seconds);
	}

	public update(
		intervals: { total: number; set: number },
		time: Time,
		intervalTimerState: IntervalTimerState,
		timerState: TimerType,
	): void {
		this.intervalCount.textContent = `${intervals.set}/${intervals.total} `;
		this.minutes.textContent = String(time.minutes).padStart(2, "0");
		this.seconds.textContent = String(time.seconds).padStart(2, "0");
		this.separator.classList.toggle(
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

	public updateTrackedTaskTooltip(currentTaskName: string | null): void {
		setTooltip(this.statusBarItem, currentTaskName ?? "", {
			placement: "top",
			delay: 100,
		});
	}

	public enableClick(intervalTimer: IntervalTimer): void {
		this.statusBarItem.classList.add("mod-clickable");
		this.statusBarItem.addEventListener("click", (event) => {
			if (event.button === 0) {
				// Left click
				intervalTimer.touch();
			}
		});
		this.statusBarItem.addEventListener("contextmenu", (event) => {
			// Right click
			event.preventDefault();
			new Menu()
				.addItem((item) => {
					item.setTitle("Reset intervals set").onClick(() => {
						intervalTimer.resetIntervalsSet();
					});
				})
				.addItem((item) => {
					item.setTitle("Retime timer").onClick(() => {
						new RetimeModal(this.app, intervalTimer).open();
					});
				})
				.showAtMouseEvent(event);
		});
	}
}
