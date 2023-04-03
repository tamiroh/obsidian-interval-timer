export abstract class TaskLine {
	protected readonly taskLine: string;

	public constructor(taskLine: string) {
		this.taskLine = taskLine;
	}

	public abstract increase(): TaskLine;

	public toString = (): string => this.taskLine;
}
