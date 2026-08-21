const maxDelayMilliseconds = 60_000;

export class DailyScheduler {
	private nextExecutionTime: Date | undefined;

	private timeoutId: number | undefined;

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
		this.scheduleTick();
	}

	public disable(): void {
		if (this.timeoutId !== undefined) {
			window.clearTimeout(this.timeoutId);
			this.timeoutId = undefined;
		}
		this.nextExecutionTime = undefined;
	}

	private scheduleTick(): void {
		const executionTime = this.nextExecutionTime;
		if (executionTime === undefined) return;

		this.timeoutId = window.setTimeout(() => {
			this.tick(executionTime);
		}, DailyScheduler.delayUntil(executionTime));
	}

	private tick(executionTime: Date): void {
		this.timeoutId = undefined;
		if (Date.now() < executionTime.getTime()) {
			this.scheduleTick();
			return;
		}

		this.onScheduledTime();
		if (this.nextExecutionTime === undefined) return;

		this.nextExecutionTime = this.executionTimeAfter(executionTime);
		this.scheduleTick();
	}

	private static delayUntil(executionTime: Date): number {
		return Math.min(
			maxDelayMilliseconds,
			Math.max(0, executionTime.getTime() - Date.now()),
		);
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

	private executionTimeAfter(previous: Date): Date {
		let next = this.addDays(previous, 1);
		while (next.getTime() <= Date.now()) {
			next = this.addDays(next, 1);
		}
		return next;
	}

	private addDays(date: Date, days: number): Date {
		const next = new Date(date);
		next.setDate(next.getDate() + days);
		return next;
	}
}
