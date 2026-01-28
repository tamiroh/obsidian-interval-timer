import { describe, expect, it, vi } from "vitest";
import { StatusBar } from "./status-bar";
import type { IntervalTimer } from "./interval-timer";

describe("StatusBar", () => {
	it("should update status bar text and color for focus state", () => {
		// Arrange
		const element = document.createElement("div");
		const statusBar = new StatusBar(element);

		// Act
		statusBar.update(
			{ total: 10, set: 3 },
			{ minutes: 5, seconds: 30 },
			"focus",
		);

		// Assert
		expect(element.textContent).toBe("3/10 05:30");
		expect(element.getAttribute("style")).toBe("color: #EE6152");
	});

	it("should update status bar text and color for break state", () => {
		// Arrange
		const element = document.createElement("div");
		const statusBar = new StatusBar(element);

		// Act
		statusBar.update(
			{ total: 8, set: 5 },
			{ minutes: 2, seconds: 15 },
			"shortBreak",
		);

		// Assert
		expect(element.textContent).toBe("5/8 02:15");
		expect(element.getAttribute("style")).toBe("color: #4CBD4F");
	});

	it("should enable click with left and right button handlers", () => {
		// Arrange
		const element = document.createElement("div");
		const statusBar = new StatusBar(element);
		const timerActions = {
			touch: vi.fn(),
			resetIntervalsSet: vi.fn(),
		};
		const intervalTimer = {
			withContext: vi.fn((_, action) => action(timerActions)),
		} as unknown as IntervalTimer;

		// Act
		statusBar.enableClick(intervalTimer);
		element.dispatchEvent(new MouseEvent("click", { button: 0 }));
		element.dispatchEvent(
			new Event("contextmenu", { bubbles: true, cancelable: true }),
		);

		// Assert
		expect(element.classList.contains("mod-clickable")).toBe(true);
		expect(intervalTimer.withContext).toHaveBeenCalledTimes(2);
		expect(intervalTimer.withContext).toHaveBeenCalledWith(
			{ "dont-flash": true },
			expect.any(Function),
		);
		expect(timerActions.touch).toHaveBeenCalledOnce();
		expect(timerActions.resetIntervalsSet).toHaveBeenCalledOnce();
	});
});
