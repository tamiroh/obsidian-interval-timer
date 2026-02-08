export class DailyScheduler {
	private nextExecutionTime: Date | undefined;

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

	public enable(): void {
		this.disable();
		this.nextExecutionTime = this.getInitialExecutionTime();
		this.intervalId = window.setInterval(() => {
			if (this.shouldExecute()) {
				this.onScheduledTime();
				if (this.nextExecutionTime === undefined) {
					throw new Error(
						"Inconsistent state: next execution time is unset",
					);
				}
				while (this.nextExecutionTime.getTime() <= Date.now()) {
					this.nextExecutionTime = this.addDays(
						this.nextExecutionTime,
						1,
					);
				}
			}
		}, 1000);
	}

	public disable(): void {
		if (this.intervalId !== undefined) {
			window.clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
		this.nextExecutionTime = undefined;
	}

	private getInitialExecutionTime(): Date {
		const now = new Date();
		const scheduled = new Date(now);
		scheduled.setHours(this.scheduledTime.hours);
		scheduled.setMinutes(this.scheduledTime.minutes);
		scheduled.setSeconds(0);
		scheduled.setMilliseconds(0);

		return now.getTime() >= scheduled.getTime()
			? this.addDays(scheduled, 1)
			: scheduled;
	}

	private shouldExecute(): boolean {
		return this.nextExecutionTime === undefined
			? false
			: Date.now() >= this.nextExecutionTime.getTime();
	}

	private addDays(date: Date, days: number): Date {
		const next = new Date(date);
		next.setDate(next.getDate() + days);
		return next;
	}
}
