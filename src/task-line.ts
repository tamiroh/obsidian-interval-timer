export class TaskLine {
	public readonly prefix: string;

	public readonly taskName: string;

	public readonly completedIntervals: number;

	public readonly carriedOverIntervals: number | null;

	public readonly estimatedIntervals: number;

	private constructor(
		prefix: string,
		taskName: string,
		completedIntervals: number,
		carriedOverIntervals: number | null,
		estimatedIntervals: number,
	) {
		this.prefix = prefix;
		this.taskName = taskName;
		this.completedIntervals = completedIntervals;
		this.carriedOverIntervals = carriedOverIntervals;
		this.estimatedIntervals = estimatedIntervals;
	}

	public toIncremented(): TaskLine {
		return new TaskLine(
			this.prefix,
			this.taskName,
			this.completedIntervals + 1,
			this.carriedOverIntervals,
			this.estimatedIntervals,
		);
	}

	public toString(): string {
		const progressText =
			this.carriedOverIntervals === null
				? String(this.completedIntervals)
				: `${this.carriedOverIntervals},${this.completedIntervals}`;
		return `${this.prefix}${this.taskName} ${progressText}/${this.estimatedIntervals}`;
	}

	public static from(line: string): TaskLine | null {
		const match = line.match(
			/^(\s*-\s\[\s\]\s+)(.*?)\s+(\d+)(?:\s*,\s*(\d+))?\s*\/\s*(\d+)\s*$/,
		);
		if (!match) {
			return null;
		}

		const prefix = match[1] ?? "";
		const name = match[2] ?? "";
		const firstCompletedText = match[3] ?? "";
		const secondCompletedText = match[4] ?? null;
		const totalText = match[5] ?? "";
		const carriedOverIntervals =
			secondCompletedText === null ? null : Number(firstCompletedText);
		const completedIntervals =
			secondCompletedText === null
				? Number(firstCompletedText)
				: Number(secondCompletedText);
		const estimatedIntervals = Number(totalText);

		return new TaskLine(
			prefix,
			name,
			completedIntervals,
			carriedOverIntervals,
			estimatedIntervals,
		);
	}
}
