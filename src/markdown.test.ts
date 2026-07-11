import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

describe("Markdown.toContent", () => {
	it("returns the original Markdown content", () => {
		const content = `first line
second line
`;

		expect(new Markdown(content).toContent()).toBe(content);
	});
});

describe("Markdown.isLineInCodeBlock", () => {
	it.each([
		[1, false],
		[2, true],
		[3, true],
		[4, true],
		[5, false],
		[6, true],
		[7, true],
		[8, true],
		[9, false],
	])("reports whether line %i is in a code block", (lineNumber, expected) => {
		const markdown = `before
\`\`\`ts
const first = true;
\`\`\`
between
~~~md
code
~~~
after`;

		expect(new Markdown(markdown).isLineInCodeBlock(lineNumber)).toBe(
			expected,
		);
	});

	it("treats an unclosed code block as extending to the last line", () => {
		const markdown = `before
\`\`\`md
code`;

		expect(new Markdown(markdown).isLineInCodeBlock(3)).toBe(true);
	});

	it("does not close a code block with a shorter fence", () => {
		const markdown = `\`\`\`\`md
code
\`\`\`
still code
\`\`\`\`
after`;

		const parsed = new Markdown(markdown);
		expect(parsed.isLineInCodeBlock(4)).toBe(true);
		expect(parsed.isLineInCodeBlock(6)).toBe(false);
	});

	it("does not close a code block with a different fence character", () => {
		const markdown = `\`\`\`md
code
~~~
still code
\`\`\`
after`;

		const parsed = new Markdown(markdown);
		expect(parsed.isLineInCodeBlock(4)).toBe(true);
		expect(parsed.isLineInCodeBlock(6)).toBe(false);
	});

	it("does not treat a fence indented by four spaces as a code block", () => {
		const markdown = `    \`\`\`md
code
    \`\`\``;

		expect(new Markdown(markdown).isLineInCodeBlock(2)).toBe(false);
	});

	it("recognizes a closing fence in CRLF content", () => {
		const markdown = "```md\r\ncode\r\n```\r\nafter";

		expect(new Markdown(markdown).isLineInCodeBlock(4)).toBe(false);
	});

	it.each([0, 2])("returns false for out-of-range line %i", (lineNumber) => {
		expect(new Markdown("content").isLineInCodeBlock(lineNumber)).toBe(
			false,
		);
	});
});
