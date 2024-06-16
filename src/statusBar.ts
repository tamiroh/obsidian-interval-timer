import { Time } from "./time";
import { IntervalTimer, IntervalTimerState } from "./intervalTimer";

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
		this.statusBarItem.setText(
			`${intervals.set}/${intervals.total} ${this.format(time)}`,
		);
		this.statusBarItem.setAttribute(
			"style",
			intervalTimerState === "focus"
				? "color: #EE6152"
				: "color: #4CBD4F",
		);
	};

	public enableClick = (intervalTimer: IntervalTimer) => {
		this.statusBarItem.addClass("mod-clickable");
		this.statusBarItem.onClickEvent(() => intervalTimer.next());
	};

	private format = (time: Time): string =>
		`${String(time.minutes).padStart(2, "0")}:${String(
			time.seconds,
		).padStart(2, "0")}`;
}
