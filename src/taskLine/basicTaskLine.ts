import { TaskLine } from "./taskLine";

export class BasicTaskLine extends TaskLine {
	public increase = (): TaskLine => {
		const regex = /(\d+)\/(\d+)$/;
		const match = this.taskLine.match(regex);

		if (!match) {
			throw new Error("Invalid task line");
		}

		const current = Number(match[1]);
		const total = Number(match[2]);
		const incremented = current + 1;

		return new BasicTaskLine(
			this.taskLine.replace(regex, `${incremented}/${total}`)
		);
	};
}
