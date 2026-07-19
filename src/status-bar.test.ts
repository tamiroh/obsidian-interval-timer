import { waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntervalTimer, IntervalTimerSetting } from "./interval-timer";
import { StatusBar } from "./status-bar";

const statusBars = new Set<StatusBar>();

const createStatusBar = async (container: HTMLElement): Promise<StatusBar> => {
	document.body.append(container);
	const statusBar = new StatusBar(container);
	statusBars.add(statusBar);
	await within(container).findByText("No task selected");
	return statusBar;
};

describe("StatusBar", () => {
	const settings: IntervalTimerSetting = {
		focusIntervalDuration: 25,
		shortBreakDuration: 5,
		longBreakDuration: 15,
		longBreakAfter: 4,
		resetTime: { hours: 0, minutes: 0 },
	};

	afterEach(() => {
		statusBars.forEach((statusBar) => statusBar.dispose());
		statusBars.clear();
		document.body.replaceChildren();
	});

	it("renders the time and interval count in the compact view", async () => {
		// Arrange
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		// Act
		statusBar.update(
			{ total: 4, set: 2 },
			{ minutes: 7, seconds: 5 },
			"focus",
			"running",
		);

		// Assert
		expect(
			el.querySelector(".interval-timer-status-bar-compact"),
		).toHaveTextContent("2/4 07:05");
		expect(el.querySelector(".interval-timer-compact-clock")).toBeNull();
		await waitFor(() =>
			expect(
				el.querySelector(".interval-timer-popover-clock-time"),
			).toHaveTextContent("07:05"),
		);
	});

	it("uses the break color without showing a phase label", async () => {
		// Arrange
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		// Act
		statusBar.update(
			{ total: 4, set: 2 },
			{ minutes: 5, seconds: 0 },
			"shortBreak",
			"paused",
		);

		// Assert
		expect(el).toHaveClass("interval-timer-status-bar-break");
		expect(el.querySelector(".interval-timer-phase")).toBeNull();
		expect(el.querySelector(".interval-timer-status")).toBeNull();
		await waitFor(() =>
			expect(el.querySelector(".interval-timer-popover")).toHaveClass(
				"interval-timer-popover-break",
			),
		);
	});

	it("visualizes the remaining proportion", async () => {
		// Arrange
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		statusBar.update(
			{ total: 0, set: 0 },
			{ minutes: 25, seconds: 0 },
			"focus",
			"initialized",
		);

		// Act
		statusBar.update(
			{ total: 0, set: 0 },
			{ minutes: 15, seconds: 0 },
			"focus",
			"running",
		);

		// Assert
		await waitFor(() =>
			expect(
				(
					el.querySelector(
						".interval-timer-popover-clock-value",
					) as SVGElement
				).style.strokeDashoffset,
			).toBe("-40"),
		);
		expect(el.querySelector(".interval-timer-progress-value")).toBeNull();
	});

	it("shows the separator as running while the timer is running", async () => {
		// Arrange
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		// Act
		statusBar.update(
			{ total: 4, set: 0 },
			{ minutes: 1, seconds: 0 },
			"focus",
			"running",
		);

		// Assert
		expect(el.querySelector(".interval-timer-time-separator")).toHaveClass(
			"interval-timer-time-separator-running",
		);
		await waitFor(() =>
			expect(
				el.querySelector(".interval-timer-popover-clock-time"),
			).toHaveTextContent("01:00"),
		);
	});

	it("does not show the separator as running once the timer is paused", async () => {
		// Arrange
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer = createIntervalTimer();
		statusBar.enableClick(intervalTimer);
		statusBar.update(
			{ total: 4, set: 0 },
			{ minutes: 1, seconds: 0 },
			"focus",
			"running",
		);

		// Act
		statusBar.update(
			{ total: 4, set: 0 },
			{ minutes: 1, seconds: 0 },
			"focus",
			"paused",
		);

		// Assert
		expect(
			el.querySelector(".interval-timer-time-separator"),
		).not.toHaveClass("interval-timer-time-separator-running");
		expect(
			await within(el).findByRole("button", { name: "Start" }),
		).toBeEnabled();
		intervalTimer.dispose();
	});

	it("shows the currently tracked task name in the hover panel", async () => {
		// Arrange
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		// Act
		statusBar.updateTrackedTask("Write report");

		// Assert
		expect(await within(el).findByText("Write report")).toBeInTheDocument();
		expect(el).not.toHaveAttribute("aria-label");
	});

	it("shows an empty state when no task is tracked", async () => {
		// Arrange
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		// Act
		statusBar.updateTrackedTask(null);

		// Assert
		expect(await within(el).findByText("No task selected")).toHaveClass(
			"interval-timer-popover-task-name-empty",
		);
	});

	it("calls touch on a left click once clicking is enabled", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer =
			createIntervalTimerWithStatusBarUpdates(statusBar);
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		statusBar.enableClick(intervalTimer);
		const compact = el.querySelector(
			".interval-timer-status-bar-compact",
		) as HTMLElement;

		// Act
		await user.click(compact);

		// Assert
		expect(touchSpy).toHaveBeenCalledOnce();
		expect(compact).not.toHaveFocus();
		expect(
			await within(el).findByRole("button", { name: "Reset" }),
		).toBeEnabled();
		expect(within(el).getByRole("button", { name: "25" })).toBeDisabled();
		intervalTimer.dispose();
	});

	it("calls touch from the keyboard once clicking is enabled", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer =
			createIntervalTimerWithStatusBarUpdates(statusBar);
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		statusBar.enableClick(intervalTimer);
		const compact = el.querySelector(
			".interval-timer-status-bar-compact",
		) as HTMLElement;
		compact.focus();

		// Act
		await user.keyboard("{Enter}");

		// Assert
		expect(touchSpy).toHaveBeenCalledOnce();
		expect(compact).toHaveFocus();
		expect(compact).toHaveAttribute("tabindex", "0");
		expect(
			await within(el).findByRole("button", { name: "Reset" }),
		).toBeEnabled();
		expect(within(el).getByRole("button", { name: "25" })).toBeDisabled();
		intervalTimer.dispose();
	});

	it("keeps popover controls outside the compact button", async () => {
		// Arrange
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer = createIntervalTimer();

		// Act
		statusBar.enableClick(intervalTimer);
		const compact = el.querySelector(
			".interval-timer-status-bar-compact",
		) as HTMLElement;
		const reset = within(el).getByRole("button", { name: "Reset set" });

		// Assert
		expect(el).toHaveAttribute("role", "timer");
		expect(compact).toHaveAttribute("role", "button");
		expect(compact).not.toContainElement(reset);
		intervalTimer.dispose();
	});

	it("does not touch the timer from popover keyboard input", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer = createIntervalTimer();
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		statusBar.enableClick(intervalTimer);
		statusBar.update(
			{ total: 0, set: 0 },
			{ minutes: 7, seconds: 0 },
			"focus",
			"initialized",
		);
		await user.click(await within(el).findByRole("button", { name: "07" }));

		// Act
		await user.keyboard("{Enter}");

		// Assert
		expect(touchSpy).not.toHaveBeenCalled();
		intervalTimer.dispose();
	});

	it("removes compact interactions when disposed", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer = createIntervalTimer();
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		statusBar.enableClick(intervalTimer);
		const compact = el.querySelector(
			".interval-timer-status-bar-compact",
		) as HTMLElement;
		// Act
		statusBar.dispose();
		statusBars.delete(statusBar);

		await user.click(compact);

		// Assert
		expect(touchSpy).not.toHaveBeenCalled();
		intervalTimer.dispose();
	});

	const createIntervalTimer = (): IntervalTimer =>
		new IntervalTimer(
			() => {},
			settings,
			() => {},
		);

	const createIntervalTimerWithStatusBarUpdates = (
		statusBar: StatusBar,
	): IntervalTimer =>
		new IntervalTimer(
			(timerState, intervalTimerState, time, intervals) =>
				statusBar.update(
					intervals,
					time,
					intervalTimerState,
					timerState,
				),
			settings,
			() => {},
		);
});
