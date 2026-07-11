import { TaskLine } from "./task-line";
import { Markdown } from "./markdown";

export class TaskManagementFile extends Markdown {
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

	private find(
		taskName: string,
	): { index: number; taskLine: TaskLine } | null {
		for (let i = 0; i < this.lines.length; i += 1) {
			const candidateLine = this.lines[i];
			const candidateTask =
				candidateLine == null ? null : TaskLine.from(candidateLine);
			if (
				candidateTask?.taskName === taskName &&
				!this.isLineInCodeBlock(i + 1)
			) {
				return { index: i, taskLine: candidateTask };
			}
		}

		return null;
	}
}
