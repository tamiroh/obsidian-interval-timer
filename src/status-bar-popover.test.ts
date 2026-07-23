import { fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntervalTimer, IntervalTimerSetting } from "./interval-timer";
import { Notice } from "./obsidian-fake";
import { StatusBarPopover } from "./status-bar-popover";

const settings: IntervalTimerSetting = {
	focusIntervalDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakAfter: 4,
	resetTime: { hours: 0, minutes: 0 },
};

const popovers = new Set<StatusBarPopover>();
const intervalTimers = new Set<IntervalTimer>();

const createPopover = async (
	container: HTMLElement,
): Promise<StatusBarPopover> => {
	document.body.append(container);
	const popover = new StatusBarPopover(container);
	popovers.add(popover);
	await within(container).findByText("No task selected");
	return popover;
};

const createIntervalTimer = (
	onChangeState: ConstructorParameters<typeof IntervalTimer>[0] = () => {},
): IntervalTimer => {
	const intervalTimer = new IntervalTimer(onChangeState, settings, () => {});
	intervalTimers.add(intervalTimer);
	return intervalTimer;
};

const getRetimeInput = (container: HTMLElement): HTMLInputElement =>
	container.querySelector(
		".interval-timer-popover-inline-retime-input",
	) as HTMLInputElement;

const getFocusedRetimeInput = async (
	container: HTMLElement,
): Promise<HTMLInputElement> => {
	const input = getRetimeInput(container);
	await waitFor(() => expect(input).toHaveFocus());
	return input;
};

const getRetimeForm = (container: HTMLElement): HTMLFormElement =>
	container.querySelector(
		".interval-timer-popover-inline-retime-form",
	) as HTMLFormElement;

describe("StatusBarPopover", () => {
	beforeEach(() => {
		Notice.messages = [];
	});

	afterEach(() => {
		popovers.forEach((popover) => popover.dispose());
		popovers.clear();
		intervalTimers.forEach((intervalTimer) => intervalTimer.dispose());
		intervalTimers.clear();
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("renders the remaining time", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");

		// Assert
		await waitFor(() =>
			expect(
				el.querySelector(".interval-timer-popover-clock-time"),
			).toHaveTextContent("07:05"),
		);
	});

	it("visualizes the remaining proportion", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		popover.update({ minutes: 25, seconds: 0 }, "focus", "initialized");

		// Act
		popover.update({ minutes: 15, seconds: 0 }, "focus", "running");

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
	});

	it("marks break intervals for break styling", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update({ minutes: 5, seconds: 0 }, "shortBreak", "paused");

		// Assert
		await waitFor(() =>
			expect(el.querySelector(".interval-timer-popover")).toHaveClass(
				"interval-timer-popover-break",
			),
		);
	});

	it("shows only the break state in the task area during a break", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		popover.updateTrackedTask("Write report");

		// Act
		popover.update({ minutes: 5, seconds: 0 }, "shortBreak", "initialized");

		// Assert
		await waitFor(() =>
			expect(
				el.querySelector(".interval-timer-popover-task-name"),
			).toHaveTextContent(/^Break time$/),
		);
	});

	it("shows progress toward the next long break", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update(
			{ minutes: 25, seconds: 0 },
			"focus",
			"initialized",
			2,
			4,
		);

		// Assert
		await waitFor(() =>
			expect(
				el.querySelectorAll(
					".interval-timer-popover-set-ring-segment-filled",
				),
			).toHaveLength(2),
		);
	});

	it("shows a completed set during a long break", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update(
			{ minutes: 15, seconds: 0 },
			"longBreak",
			"initialized",
			0,
			4,
		);

		// Assert
		await waitFor(() =>
			expect(
				el.querySelectorAll(
					".interval-timer-popover-set-ring-segment-filled",
				),
			).toHaveLength(4),
		);
	});

	it("updates the tracked task", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.updateTrackedTask("Write report");

		// Assert
		expect(await within(el).findByText("Write report")).toBeInTheDocument();
	});

	it("resets the interval set when Reset set is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		const resetSpy = vi.spyOn(intervalTimer, "resetIntervalsSet");
		popover.enableActions(intervalTimer);
		await waitFor(() =>
			expect(
				within(el).getByRole("button", { name: "Start" }),
			).toBeEnabled(),
		);
		const resetSet = await within(el).findByRole("button", {
			name: "Reset set",
		});

		// Act
		await user.click(resetSet);

		// Assert
		expect(resetSpy).toHaveBeenCalledOnce();
	});

	it("shows Reset after Start is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		const start = within(el).getByRole("button", { name: "Start" });
		popover.enableActions(intervalTimer);
		await waitFor(() => expect(start).toBeEnabled());

		// Act
		await user.click(start);

		// Assert
		expect(
			await within(el).findByRole("button", { name: "Reset" }),
		).toBeEnabled();
	});

	it("does not pin the popover when Start is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.enableActions(intervalTimer);
		const start = within(el).getByRole("button", { name: "Start" });
		await waitFor(() => expect(start).toBeEnabled());

		// Act
		await user.click(start);

		// Assert
		expect(el.querySelector(".interval-timer-popover")).not.toHaveClass(
			"interval-timer-popover-pinned",
		);
	});

	it("removes focus from Start after it is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.enableActions(intervalTimer);
		const start = within(el).getByRole("button", { name: "Start" });
		await waitFor(() => expect(start).toBeEnabled());

		// Act
		await user.click(start);

		// Assert
		expect(start).not.toHaveFocus();
	});

	it("touches the timer when Reset is clicked during focus", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		const touchSpy = vi.spyOn(intervalTimer, "touch");
		intervalTimer.start();
		popover.enableActions(intervalTimer);
		popover.update({ minutes: 24, seconds: 0 }, "focus", "running");

		// Act
		await user.click(
			await within(el).findByRole("button", { name: "Reset" }),
		);

		// Assert
		expect(touchSpy).toHaveBeenCalledOnce();
	});

	it("shows skip while a break interval is running", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		intervalTimer.applySnapshot({
			state: "shortBreak",
			minutes: 4,
			seconds: 0,
			focusIntervals: { total: 0, set: 0 },
		});
		intervalTimer.start();
		popover.enableActions(intervalTimer);

		// Act
		popover.update({ minutes: 4, seconds: 0 }, "shortBreak", "running");

		// Assert
		expect(
			await within(el).findByRole("button", { name: "Skip" }),
		).toBeEnabled();
	});

	it("shows resume while an interval is paused", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		intervalTimer.start();
		intervalTimer.pause();
		popover.enableActions(intervalTimer);

		// Act
		popover.update({ minutes: 12, seconds: 0 }, "focus", "paused");

		// Assert
		expect(
			await within(el).findByRole("button", { name: "Resume" }),
		).toBeEnabled();
	});

	it("disables start until an interval timer is provided", async () => {
		// Arrange
		const el = createDiv();
		await createPopover(el);

		// Act
		const start = within(el).getByRole("button", { name: "Start" });

		// Assert
		expect(start).toBeDisabled();
	});

	it("opens the minutes as an inline input", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);

		// Act
		await user.click(await within(el).findByRole("button", { name: "07" }));

		// Assert
		expect(await getFocusedRetimeInput(el)).toHaveValue("7");
	});

	it("keeps the seconds as text while editing the minutes", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);

		// Act
		await user.click(await within(el).findByRole("button", { name: "07" }));

		// Assert
		expect(within(el).getByText("05")).toBeInTheDocument();
	});

	it("selects the entire minute value when the input is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.update({ minutes: 12, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "12" }));
		const input = await getFocusedRetimeInput(el);
		input.setSelectionRange(1, 1);

		// Act
		await user.click(input);

		// Assert
		expect([input.selectionStart, input.selectionEnd]).toEqual([
			0,
			input.value.length,
		]);
	});

	it("disables retime while the timer is running", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.enableActions(intervalTimer);
		// Act
		popover.update({ minutes: 7, seconds: 0 }, "focus", "running");

		// Assert
		const minutes = await within(el).findByRole("button", {
			name: "07",
		});
		expect(minutes).toBeDisabled();
	});

	it("applies a time edited in place", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const handleChangeState = vi.fn();
		const intervalTimer = createIntervalTimer(handleChangeState);
		handleChangeState.mockClear();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));
		await getFocusedRetimeInput(el);

		// Act
		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "12");
		fireEvent.submit(getRetimeForm(el));

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 12, seconds: 0 },
			{ set: 0, total: 0 },
		);
	});

	it("applies an edited time on focusout", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const handleChangeState = vi.fn();
		const intervalTimer = createIntervalTimer(handleChangeState);
		handleChangeState.mockClear();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));
		await getFocusedRetimeInput(el);

		// Act
		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "18");
		await user.tab();

		// Assert
		expect(handleChangeState).toHaveBeenCalledWith(
			"initialized",
			"focus",
			{ minutes: 18, seconds: 0 },
			{ set: 0, total: 0 },
		);
	});

	it("reports an invalid inline time", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.update({ minutes: 7, seconds: 5 }, "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));
		await getFocusedRetimeInput(el);

		// Act
		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "1.5");
		fireEvent.submit(getRetimeForm(el));

		// Assert
		expect(Notice.messages).toEqual([
			"Enter a positive whole number of minutes.",
		]);
	});

	it("keeps a minute click from triggering the status bar click", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const statusBarClick = vi.fn();
		el.addEventListener("click", statusBarClick);
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.enableActions(intervalTimer);
		await waitFor(() =>
			expect(
				within(el).getByRole("button", { name: "00" }),
			).toBeEnabled(),
		);

		// Act
		await user.click(within(el).getByRole("button", { name: "00" }));

		// Assert
		expect(statusBarClick).not.toHaveBeenCalled();
	});

	it("pins the popover after it is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 24,
			top: 36,
		} as DOMRect);

		// Act
		await user.click(popover);

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-pinned");
		expect(el).toHaveClass("interval-timer-status-bar-popover-pinned");
		expect(popover).toHaveStyle({
			left: "24px",
			top: "36px",
		});
		expect(
			el.querySelector(".interval-timer-popover-root"),
		).toContainElement(popover);
	});

	it("pins the focused popover from the keyboard", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		popover.focus();

		// Act
		await user.keyboard("{Enter}");

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-pinned");
	});

	it("moves a pinned popover by dragging it", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 200,
			width: 250,
			height: 150,
		} as DOMRect);
		await user.click(popover);

		// Act
		fireEvent.pointerDown(popover, {
			pointerId: 1,
			clientX: 120,
			clientY: 230,
		});
		expect(popover).toHaveClass("interval-timer-popover-dragging");
		fireEvent.pointerMove(popover, {
			pointerId: 1,
			clientX: 320,
			clientY: 330,
		});
		fireEvent.pointerUp(popover, { pointerId: 1 });

		// Assert
		expect(popover).toHaveStyle({
			left: "300px",
			top: "300px",
		});
		expect(popover).not.toHaveClass("interval-timer-popover-dragging");
	});

	it("does not start dragging from a popover control", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 200,
			width: 250,
			height: 150,
		} as DOMRect);
		await user.click(popover);

		// Act
		fireEvent.pointerDown(
			within(el).getByRole("button", { name: "Close" }),
			{
				pointerId: 1,
				clientX: 120,
				clientY: 230,
			},
		);
		fireEvent.pointerMove(popover, {
			pointerId: 1,
			clientX: 320,
			clientY: 330,
		});

		// Assert
		expect(popover).not.toHaveClass("interval-timer-popover-dragging");
		expect(popover).toHaveStyle({
			left: "100px",
			top: "200px",
		});
	});

	it("keeps the hidden close button out of the tab order", async () => {
		// Arrange
		const el = createDiv();
		await createPopover(el);

		// Act
		const close = el.querySelector(
			".interval-timer-popover-close",
		) as HTMLButtonElement;

		// Assert
		expect(close).toHaveProperty("tabIndex", -1);
	});

	it("adds the visible close button to the tab order when pinned", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;

		// Act
		await user.click(popover);

		// Assert
		const close = within(el).getByRole("button", { name: "Close" });
		expect(close).toHaveProperty("tabIndex", 0);
	});

	it("keeps a pinned popover open after the pointer leaves", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		await user.click(popover);

		// Act
		fireEvent.mouseLeave(el);

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-pinned");
	});

	it("dismisses a pinned popover from its close button", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		el.createSpan({ cls: "interval-timer-status-bar-compact" }).tabIndex =
			0;
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
			left: 900,
			top: 700,
			width: 50,
			height: 20,
		} as DOMRect);
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 200,
			width: 250,
			height: 150,
		} as DOMRect);
		await user.click(popover);

		// Act
		await user.click(within(el).getByRole("button", { name: "Close" }));

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-returning");
		expect(popover).toHaveStyle({
			transform: "translate(700px, 435px) scale(0.15)",
		});
		expect(el).toHaveClass("interval-timer-status-bar-popover-pinned");

		// Act
		fireEvent.transitionEnd(popover, { propertyName: "transform" });

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-dismissed");
		expect(el).not.toHaveClass("interval-timer-status-bar-popover-pinned");
		expect(popover.style.left).toBe("");
		expect(popover.style.top).toBe("");
	});

	it("restores compact focus after closing from the keyboard", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const compact = el.createSpan({
			cls: "interval-timer-status-bar-compact",
		});
		compact.tabIndex = 0;
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		await user.click(popover);
		const close = within(el).getByRole("button", { name: "Close" });
		close.focus();

		// Act
		await user.keyboard("{Enter}");

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-returning");

		// Act
		fireEvent.transitionEnd(popover, { propertyName: "transform" });

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-dismissed");
		await waitFor(() => expect(compact).toHaveFocus());
	});

	it("clears dismissal when focus returns to the status item", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const focusTarget = createEl("button");
		el.append(focusTarget);
		await createPopover(el);
		const popover = el.querySelector(
			".interval-timer-popover",
		) as HTMLElement;
		await user.click(popover);
		await user.click(within(el).getByRole("button", { name: "Close" }));

		// Act
		await user.click(focusTarget);

		// Assert
		expect(popover).not.toHaveClass("interval-timer-popover-dismissed");
	});
});
