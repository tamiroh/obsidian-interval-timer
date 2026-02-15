import { TaskLine } from "./task-line";

export class TaskManagementFile {
	private readonly lines: string[];

	constructor(content: string) {
		this.lines = content.split("\n");
	}

	public toIncremented(taskName: string): TaskManagementFile | null {
		const target = this.find(taskName);
		if (target == null) {
			return null;
		}

		return new TaskManagementFile(
			this.lines
				.slice()
				.map((line, index) =>
					index === target.index
						? target.taskLine.toIncremented().toString()
						: line,
				)
				.join("\n"),
		);
	}

	public toContent(): string {
		return this.lines.join("\n");
	}

	private find(
		taskName: string,
	): { index: number; taskLine: TaskLine } | null {
		for (let i = 0; i < this.lines.length; i += 1) {
			const candidateLine = this.lines[i];
			const candidateTask =
				candidateLine == null ? null : TaskLine.from(candidateLine);
			if (candidateTask?.taskName === taskName) {
				return { index: i, taskLine: candidateTask };
			}
		}

		return null;
	}
}
