import { format } from "./utils";
import { Time } from "./types/time";
import { IntervalTimerState } from "./intervalTimerManager";

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
			`${intervals.set}/${intervals.total} ${format(time)}`,
		);
		this.statusBarItem.setAttribute(
			"style",
			intervalTimerState === "focus"
				? "color: #EE6152"
				: "color: #4CBD4F",
		);
	};
}
