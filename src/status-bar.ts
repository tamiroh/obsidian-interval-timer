import { App, Menu } from "obsidian";
import { Time } from "./time";
import { IntervalTimer, IntervalTimerState } from "./interval-timer";
import { RetimeModal } from "./retime-modal";

export class StatusBar {
	private statusBarItem: HTMLElement;

	private app: App;

	constructor(statusBarElement: HTMLElement, app: App) {
		this.statusBarItem = statusBarElement;
		this.app = app;
	}

	public update(
		intervals: { total: number; set: number },
		time: Time,
		intervalTimerState: IntervalTimerState,
	): void {
		this.statusBarItem.textContent = `${intervals.set}/${intervals.total} ${this.format(time)}`;
		this.statusBarItem.setAttribute(
			"style",
			intervalTimerState === "focus"
				? "color: #EE6152"
				: "color: #4CBD4F",
		);
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

	private format(time: Time): string {
		return `${String(time.minutes).padStart(2, "0")}:${String(
			time.seconds,
		).padStart(2, "0")}`;
	}
}
