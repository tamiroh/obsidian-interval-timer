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
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		statusBar.update(
			{ total: 4, set: 2 },
			{ minutes: 7, seconds: 5 },
			"focus",
			"running",
		);

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
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		statusBar.update(
			{ total: 4, set: 2 },
			{ minutes: 5, seconds: 0 },
			"shortBreak",
			"paused",
		);

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
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		statusBar.update(
			{ total: 0, set: 0 },
			{ minutes: 25, seconds: 0 },
			"focus",
			"initialized",
		);

		statusBar.update(
			{ total: 0, set: 0 },
			{ minutes: 15, seconds: 0 },
			"focus",
			"running",
		);

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
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		statusBar.update(
			{ total: 4, set: 0 },
			{ minutes: 1, seconds: 0 },
			"focus",
			"running",
		);

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

		statusBar.update(
			{ total: 4, set: 0 },
			{ minutes: 1, seconds: 0 },
			"focus",
			"paused",
		);

		expect(
			el.querySelector(".interval-timer-time-separator"),
		).not.toHaveClass("interval-timer-time-separator-running");
		expect(
			await within(el).findByRole("button", { name: "Start" }),
		).toBeEnabled();
		intervalTimer.dispose();
	});

	it("shows the currently tracked task name in the hover panel", async () => {
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		statusBar.updateTrackedTask("Write report");

		expect(await within(el).findByText("Write report")).toBeInTheDocument();
		expect(el).not.toHaveAttribute("aria-label");
	});

	it("shows an empty state when no task is tracked", async () => {
		const el = createDiv();
		const statusBar = await createStatusBar(el);

		statusBar.updateTrackedTask(null);

		expect(await within(el).findByText("No task selected")).toHaveClass(
			"interval-timer-popover-task-name-empty",
		);
	});

	it("calls touch on a left click once clicking is enabled", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer = createIntervalTimer();
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		statusBar.enableClick(intervalTimer);
		const compact = el.querySelector(
			".interval-timer-status-bar-compact",
		) as HTMLElement;

		await user.click(compact);

		expect(touchSpy).toHaveBeenCalledOnce();
		intervalTimer.dispose();
	});

	it("calls touch from the keyboard once clicking is enabled", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer = createIntervalTimer();
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		statusBar.enableClick(intervalTimer);
		const compact = el.querySelector(
			".interval-timer-status-bar-compact",
		) as HTMLElement;
		compact.focus();

		await user.keyboard("{Enter}");

		expect(touchSpy).toHaveBeenCalledOnce();
		expect(compact).toHaveFocus();
		expect(compact).toHaveAttribute("tabindex", "0");
		intervalTimer.dispose();
	});

	it("keeps popover controls outside the compact button", async () => {
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer = createIntervalTimer();
		statusBar.enableClick(intervalTimer);
		const compact = el.querySelector(
			".interval-timer-status-bar-compact",
		) as HTMLElement;
		const reset = within(el).getByRole("button", { name: "Reset set" });

		expect(el).toHaveAttribute("role", "timer");
		expect(compact).toHaveAttribute("role", "button");
		expect(compact).not.toContainElement(reset);
		intervalTimer.dispose();
	});

	it("does not touch the timer from popover keyboard input", async () => {
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

		await user.keyboard("{Enter}");

		expect(touchSpy).not.toHaveBeenCalled();
		intervalTimer.dispose();
	});

	it("removes compact interactions when disposed", async () => {
		const user = userEvent.setup();
		const el = createDiv();
		const statusBar = await createStatusBar(el);
		const intervalTimer = createIntervalTimer();
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		statusBar.enableClick(intervalTimer);
		const compact = el.querySelector(
			".interval-timer-status-bar-compact",
		) as HTMLElement;
		statusBar.dispose();
		statusBars.delete(statusBar);

		await user.click(compact);

		expect(touchSpy).not.toHaveBeenCalled();
		intervalTimer.dispose();
	});

	const createIntervalTimer = (): IntervalTimer =>
		new IntervalTimer(
			() => {},
			settings,
			() => {},
		);
});
