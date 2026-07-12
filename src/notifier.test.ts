import { beforeEach, describe, expect, it } from "vitest";
import { Notice } from "./obsidian-fake";
import { createNotifier } from "./notifier";

describe("SimpleNotifier", () => {
	beforeEach(() => {
		Notice.messages = [];
	});

	it("shows a system notice with the given message", () => {
		// Arrange
		const notifier = createNotifier("simple");

		// Act
		notifier.notify("Now it's time to focus");

		// Assert
		expect(Notice.messages).toEqual(["Now it's time to focus"]);
	});
});
