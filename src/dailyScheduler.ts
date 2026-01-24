import moment from "moment";

type YearMonthDay = { year: number; month: number; day: number };

const isSameDay = (a: YearMonthDay, b: YearMonthDay): boolean => a.year === b.year && a.month === b.month && a.day === b.day;

const toYearMonthDay = (m: moment.Moment): YearMonthDay => ({
		year: m.year(),
		month: m.month() + 1,
		day: m.date(),
	});

export class DailyScheduler {
	private lastExecutionDate: YearMonthDay | undefined;

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
				this.lastExecutionDate = toYearMonthDay(moment());
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

		// Don't execute if we already executed today
		if (
			this.lastExecutionDate !== undefined &&
			isSameDay(this.lastExecutionDate, toYearMonthDay(now))
		) {
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
