import { TaskLine } from "./task-line";

export class TaskManagementFile {
	private readonly lines: string[];

	constructor(content: string) {
		this.lines = content.split("\n");
	}

	public toIncremented(taskName: string): TaskManagementFile | null {
		const lineIndex = this.findIndex(taskName);
		if (lineIndex == null) {
			return null;
		}

		const lineText = this.lines[lineIndex];
		if (lineText == null) {
			return null;
		}

		const lineTask = TaskLine.from(lineText);
		if (!lineTask) {
			return null;
		}

		return new TaskManagementFile(
			this.lines
				.slice()
				.map((line, index) =>
					index === lineIndex
						? lineTask.toIncremented().toString()
						: line,
				)
				.join("\n"),
		);
	}

	public toContent(): string {
		return this.lines.join("\n");
	}

	private findIndex(taskName: string): number | null {
		for (let i = 0; i < this.lines.length; i += 1) {
			const candidateLine = this.lines[i];
			const candidateTask =
				candidateLine == null ? null : TaskLine.from(candidateLine);
			if (candidateTask?.taskName === taskName) {
				return i;
			}
		}

		return null;
	}
}
