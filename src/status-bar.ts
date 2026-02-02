import { Time } from "./time";
import { IntervalTimer, IntervalTimerState } from "./interval-timer";

export class StatusBar {
	private statusBarItem: HTMLElement;

	constructor(statusBarElement: HTMLElement) {
		this.statusBarItem = statusBarElement;
	}

	public update = (
		intervals: { total: number; set: number },
		time: Time,
		intervalTimerState: IntervalTimerState,
	) => {
		this.statusBarItem.textContent = `${intervals.set}/${intervals.total} ${this.format(time)}`;
		this.statusBarItem.setAttribute(
			"style",
			intervalTimerState === "focus"
				? "color: #EE6152"
				: "color: #4CBD4F",
		);
	};

	public enableClick = (intervalTimer: IntervalTimer) => {
		this.statusBarItem.classList.add("mod-clickable");
		this.statusBarItem.addEventListener("click", (event) => {
			if (event.button === 0) {
				// Left click
				intervalTimer.touch();
			}
		});
		this.statusBarItem.addEventListener("contextmenu", () => {
			// Right click
			intervalTimer.resetIntervalsSet();
		});
	};

	private format = (time: Time): string =>
		`${String(time.minutes).padStart(2, "0")}:${String(
			time.seconds,
		).padStart(2, "0")}`;
}
