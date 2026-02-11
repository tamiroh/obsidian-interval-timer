export class TaskLine {
	private readonly prefix: string;

	private readonly taskNameValue: string;

	private readonly completedIntervals: number;

	private readonly estimatedIntervals: number;

	private constructor(
		prefix: string,
		taskName: string,
		completedIntervals: number,
		estimatedIntervals: number,
	) {
		this.prefix = prefix;
		this.taskNameValue = taskName;
		this.completedIntervals = completedIntervals;
		this.estimatedIntervals = estimatedIntervals;
	}

	public get taskName(): string {
		return this.taskNameValue;
	}

	public toIncremented(): TaskLine {
		return new TaskLine(
			this.prefix,
			this.taskNameValue,
			this.completedIntervals + 1,
			this.estimatedIntervals,
		);
	}

	public toString(): string {
		return `${this.prefix}${this.taskNameValue} ${this.completedIntervals}/${this.estimatedIntervals}`;
	}

	public static from(line: string): TaskLine | null {
		const match = line.match(
			/^(\s*-\s\[\s\]\s+)(.*?)\s+(\d+)\s*\/\s*(\d+)\s*$/,
		);
		if (!match) {
			return null;
		}

		const prefix = match[1];
		const name = match[2];
		const currentText = match[3];
		const totalText = match[4];
		if (
			prefix == null ||
			name == null ||
			currentText == null ||
			totalText == null
		) {
			return null;
		}

		const completedIntervals = Number(currentText);
		const estimatedIntervals = Number(totalText);
		if (
			!Number.isFinite(completedIntervals) ||
			!Number.isFinite(estimatedIntervals)
		) {
			return null;
		}

		return new TaskLine(
			prefix,
			name,
			completedIntervals,
			estimatedIntervals,
		);
	}
}
