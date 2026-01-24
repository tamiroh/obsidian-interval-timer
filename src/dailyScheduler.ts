import moment from "moment";

export class DailyScheduler {
	private lastExecutionDate: string | undefined;

	private intervalId: number | undefined;

	private readonly scheduledTime: { hours: number; minutes: number };

	private readonly onScheduledTime: () => void;

	constructor(
		scheduledTime: { hours: number; minutes: number },
		onScheduledTime: () => void,
	) {
		this.scheduledTime = scheduledTime;
		this.onScheduledTime = onScheduledTime;
		this.lastExecutionDate = undefined;
	}

	public enable(): void {
		this.disable();

		const check = () => {
			if (this.shouldExecute()) {
				this.onScheduledTime();
				this.lastExecutionDate = moment().format("YYYY-MM-DD");
			}
		};

		check();
		this.intervalId = window.setInterval(check, 1000);
	}

	public disable(): void {
		if (this.intervalId !== undefined) {
			window.clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
	}

	private shouldExecute(): boolean {
		const now = moment();
		const today = now.format("YYYY-MM-DD");

		// Don't execute if we already executed today
		if (this.lastExecutionDate === today) {
			return false;
		}

		const todayScheduledTime = moment()
			.hours(this.scheduledTime.hours)
			.minutes(this.scheduledTime.minutes)
			.seconds(0)
			.milliseconds(0);

		return now.isSameOrAfter(todayScheduledTime);
	}
}
