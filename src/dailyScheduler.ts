import moment from "moment";

export class DailyScheduler {
	private nextExecutionTime: moment.Moment | undefined;

	private intervalId: number | undefined;

	private readonly scheduledTime: { hours: number; minutes: number };

	private readonly onScheduledTime: () => void;

	constructor(
		scheduledTime: { hours: number; minutes: number },
		onScheduledTime: () => void,
	) {
		this.scheduledTime = scheduledTime;
		this.onScheduledTime = onScheduledTime;
	}

	public enable = (): void => {
		this.disable();
		this.nextExecutionTime = this.getInitialExecutionTime();
		this.intervalId = window.setInterval(() => {
			if (this.shouldExecute()) {
				this.onScheduledTime();
				this.nextExecutionTime!.add(1, "day");
			}
		}, 1000);
	};

	public disable = (): void => {
		if (this.intervalId !== undefined) {
			window.clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
		this.nextExecutionTime = undefined;
	};

	private getInitialExecutionTime = (): moment.Moment => {
		const scheduled = moment()
			.hours(this.scheduledTime.hours)
			.minutes(this.scheduledTime.minutes)
			.seconds(0)
			.milliseconds(0);

		if (moment().isSameOrAfter(scheduled)) {
			scheduled.add(1, "day");
		}

		return scheduled;
	};

	private shouldExecute = (): boolean => this.nextExecutionTime === undefined
			? false
			: moment().isSameOrAfter(this.nextExecutionTime);
}
