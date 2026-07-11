type Fence = {
	character: "`" | "~";
	length: number;
};

export class Markdown {
	protected readonly lines: string[];

	constructor(content: string) {
		this.lines = content.split("\n");
	}

	public toContent(): string {
		return this.lines.join("\n");
	}

	public isLineInCodeBlock(lineNumber: number): boolean {
		if (lineNumber < 1 || lineNumber > this.lines.length) return false;

		let fence: Fence | null = null;
		for (let index = 0; index < lineNumber - 1; index += 1) {
			const line = this.lines[index] ?? "";
			if (fence === null) {
				fence = Markdown.parseOpeningFence(line);
				continue;
			}

			if (Markdown.isClosingFence(line, fence)) fence = null;
		}

		return (
			fence !== null ||
			Markdown.parseOpeningFence(this.lines[lineNumber - 1] ?? "") !==
				null
		);
	}

	private static parseOpeningFence(line: string): Fence | null {
		const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
		const sequence = match?.[1];
		if (sequence === undefined) return null;

		const character = sequence[0];
		if (character === "`" && (match?.[2] ?? "").includes("`")) return null;
		if (character !== "`" && character !== "~") return null;

		return { character, length: sequence.length };
	}

	private static isClosingFence(line: string, fence: Fence): boolean {
		const sequence = line.match(/^ {0,3}(`+|~+)[ \t]*\r?$/)?.[1];
		return (
			sequence !== undefined &&
			sequence[0] === fence.character &&
			sequence.length >= fence.length
		);
	}
}
