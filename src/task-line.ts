export class TaskLine {
	public readonly prefix: string;

	public readonly taskName: string;

	public readonly completedIntervals: number;

	public readonly estimatedIntervals: number;

	private constructor(
		prefix: string,
		taskName: string,
		completedIntervals: number,
		estimatedIntervals: number,
	) {
		this.prefix = prefix;
		this.taskName = taskName;
		this.completedIntervals = completedIntervals;
		this.estimatedIntervals = estimatedIntervals;
	}

	public toIncremented(): TaskLine {
		return new TaskLine(
			this.prefix,
			this.taskName,
			this.completedIntervals + 1,
			this.estimatedIntervals,
		);
	}

	public toString(): string {
		return `${this.prefix}${this.taskName} ${this.completedIntervals}/${this.estimatedIntervals}`;
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
