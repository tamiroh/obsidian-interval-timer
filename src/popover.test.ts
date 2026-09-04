import { fireEvent, waitFor, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
	IntervalTimer,
	type IntervalTimerEvent,
	type IntervalTimerSetting,
} from "./interval-timer";
import { Popover } from "./popover";
import * as t from "./time";

const settings: IntervalTimerSetting = {
	focusIntervalDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakAfter: 4,
	resetTime: { hours: 0, minutes: 0 },
};

const popovers = new Set<Popover>();
const intervalTimers = new Set<IntervalTimer>();

const createOptions = (returnTarget = { left: 0, top: 0 }) => ({
	getReturnTarget: vi.fn(() => returnTarget),
	onFloatingChange: vi.fn(),
	onRestoreFocus: vi.fn(),
	notify: vi.fn(),
	renderIcon: vi.fn(),
});

const createPopover = async (
	container: HTMLElement,
	options = createOptions(),
): Promise<Popover> => {
	document.body.append(container);
	const popover = new Popover(container, options);
	popovers.add(popover);
	await within(container).findByText("No task selected");
	return popover;
};

const createIntervalTimer = (): IntervalTimer => {
	const intervalTimer = new IntervalTimer(settings);
	intervalTimers.add(intervalTimer);
	return intervalTimer;
};

const getRetimeInput = (container: HTMLElement): HTMLInputElement =>
	within(container).getByRole("textbox", {
		name: "Retime minutes",
	});

const getFocusedRetimeInput = async (
	container: HTMLElement,
): Promise<HTMLInputElement> => {
	const input = getRetimeInput(container);
	await waitFor(() => expect(input).toHaveFocus());
	return input;
};

const getRetimeForm = (container: HTMLElement): HTMLFormElement =>
	within(container).getByRole("form", {
		name: "Retime",
	});

const mockComputedStyleFor = (
	target: HTMLElement,
	style: Partial<CSSStyleDeclaration>,
): MockInstance<typeof window.getComputedStyle> => {
	const realGetComputedStyle = (element: Element): CSSStyleDeclaration =>
		window.getComputedStyle(element);

	return vi
		.spyOn(window, "getComputedStyle")
		.mockImplementation((element) =>
			element === target
				? (style as CSSStyleDeclaration)
				: realGetComputedStyle(element),
		);
};

describe("Popover", () => {
	afterEach(() => {
		popovers.forEach((popover) => {
			popover.dispose();
		});
		popovers.clear();
		intervalTimers.forEach((intervalTimer) => {
			intervalTimer.dispose();
		});
		intervalTimers.clear();
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("renders the remaining time", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update(t.time(7, 5), "focus", "initialized");

		// Assert
		await waitFor(() =>
			expect(
				within(el).getByTestId("popover-clock-time"),
			).toHaveTextContent("07:05"),
		);
	});

	it("visualizes the remaining proportion", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		popover.enableActions(createIntervalTimer());
		popover.update(t.time(25, 0), "focus", "initialized");

		// Act
		popover.update(t.time(15, 0), "focus", "running");

		// Assert
		await waitFor(() =>
			expect(
				within(el).getByTestId(
					"popover-clock-value",
				) as unknown as SVGElement,
			).toHaveStyle({ strokeDashoffset: "-40" }),
		);
	});

	it("shows a negative sign and drains the ring while counting past zero", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		popover.update(t.time(25, 0), "focus", "initialized");

		// Act
		popover.update(t.neg(t.time(0, 5)), "focus", "running");

		// Assert
		await waitFor(() =>
			expect(
				within(el).getByTestId("popover-clock-time"),
			).toHaveTextContent("-00:05"),
		);
		expect(within(el).getByTestId("popover-clock-time")).toHaveClass(
			"interval-timer-popover-clock-time-negative",
		);
		expect(
			within(el).getByTestId(
				"popover-clock-value",
			) as unknown as SVGElement,
		).toHaveStyle({ strokeDashoffset: "-100" });
	});

	it("disables retime while counting past zero", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		popover.enableActions(intervalTimer);

		// Act
		popover.update(t.neg(t.time(0, 5)), "focus", "initialized");

		// Assert
		expect(
			await within(el).findByRole("button", { name: "00" }),
		).toBeDisabled();
	});

	it("marks break intervals for break styling", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update(t.time(5, 0), "shortBreak", "paused");

		// Assert
		await waitFor(() =>
			expect(within(el).getByRole("group")).toHaveClass(
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
		popover.update(t.time(5, 0), "shortBreak", "initialized");

		// Assert
		await waitFor(() =>
			expect(within(el).getByText(/^Break time$/)).toBeInTheDocument(),
		);
	});

	it("shows progress toward the next long break", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update(t.time(25, 0), "focus", "initialized", 2, 4);

		// Assert
		await waitFor(() => {
			expect(
				within(el)
					.getAllByTestId("popover-set-ring-segment")
					.filter((segment) =>
						segment.classList.contains(
							"interval-timer-popover-set-ring-segment-filled",
						),
					),
			).toHaveLength(2);
		});
	});

	it("shows a completed set during a long break", async () => {
		// Arrange
		const el = createDiv();
		const popover = await createPopover(el);

		// Act
		popover.update(t.time(15, 0), "longBreak", "initialized", 0, 4);

		// Assert
		await waitFor(() => {
			expect(
				within(el)
					.getAllByTestId("popover-set-ring-segment")
					.filter((segment) =>
						segment.classList.contains(
							"interval-timer-popover-set-ring-segment-filled",
						),
					),
			).toHaveLength(4);
		});
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

	it("does not enter floating mode when Start is clicked", async () => {
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
		expect(within(el).getByRole("group")).not.toHaveClass(
			"interval-timer-popover-floating",
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
		popover.update(t.time(24, 0), "focus", "running");

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
			sign: 1,
			minutes: 4,
			seconds: 0,
			focusIntervals: { total: 0, set: 0 },
		});
		intervalTimer.start();
		popover.enableActions(intervalTimer);

		// Act
		popover.update(t.time(4, 0), "shortBreak", "running");

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
		popover.update(t.time(12, 0), "focus", "paused");

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
		popover.update(t.time(7, 5), "focus", "initialized");
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
		popover.update(t.time(7, 5), "focus", "initialized");
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
		popover.update(t.time(12, 5), "focus", "initialized");
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
		popover.update(t.time(7, 0), "focus", "running");

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
		const intervalTimer = createIntervalTimer();
		const events: IntervalTimerEvent[] = [];
		intervalTimer.subscribe((event) => events.push(event));
		popover.update(t.time(7, 5), "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));
		await getFocusedRetimeInput(el);

		// Act
		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "12");
		fireEvent.submit(getRetimeForm(el));

		// Assert
		expect(events).toContainEqual(
			expect.objectContaining({
				type: "state-changed",
				timerState: "initialized",
				snapshot: {
					state: "focus",
					sign: 1,
					minutes: 12,
					seconds: 0,
					intervalDuration: {
						sign: 1,
						minutes: 12,
						seconds: 0,
					},
					focusIntervals: { set: 0, total: 0 },
				},
			}),
		);
	});

	it("applies an edited time on focusout", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const popover = await createPopover(el);
		const intervalTimer = createIntervalTimer();
		const events: IntervalTimerEvent[] = [];
		intervalTimer.subscribe((event) => events.push(event));
		popover.update(t.time(7, 5), "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));
		await getFocusedRetimeInput(el);

		// Act
		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "18");
		await user.tab();

		// Assert
		expect(events).toContainEqual(
			expect.objectContaining({
				type: "state-changed",
				timerState: "initialized",
				snapshot: {
					state: "focus",
					sign: 1,
					minutes: 18,
					seconds: 0,
					intervalDuration: {
						sign: 1,
						minutes: 18,
						seconds: 0,
					},
					focusIntervals: { set: 0, total: 0 },
				},
			}),
		);
	});

	it("reports an invalid inline time", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const notify = vi.fn();
		const popover = await createPopover(el, { ...createOptions(), notify });
		const intervalTimer = createIntervalTimer();
		popover.update(t.time(7, 5), "focus", "initialized");
		popover.enableActions(intervalTimer);
		await user.click(await within(el).findByRole("button", { name: "07" }));
		await getFocusedRetimeInput(el);

		// Act
		await user.clear(getRetimeInput(el));
		await user.type(getRetimeInput(el), "1.5");
		fireEvent.submit(getRetimeForm(el));

		// Assert
		expect(notify).toHaveBeenCalledWith("Enter a whole number.");
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

	it("enters floating mode after the popover is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const options = createOptions();
		await createPopover(el, options);
		const popover = within(el).getByRole("group");
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 24,
			top: 36,
		} as DOMRect);

		// Act
		await user.click(popover);

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-floating");
		expect(options.onFloatingChange).toHaveBeenLastCalledWith(true);
		expect(popover).toHaveStyle({
			left: "24px",
			top: "36px",
		});
		expect(within(el).getByTestId("popover-root")).toContainElement(
			popover,
		);
	});

	it("enters floating mode from the keyboard", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = within(el).getByRole("group");
		popover.focus();

		// Act
		await user.keyboard("{Enter}");

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-floating");
	});

	it("starts floating immediately when floatOnMount is set", async () => {
		// Arrange
		const el = createDiv();
		const options = { ...createOptions(), floatOnMount: true };

		// Act
		await createPopover(el, options);

		// Assert
		const popover = within(el).getByRole("group");
		expect(popover).toHaveClass("interval-timer-popover-floating");
	});

	it("hides the close button when dismissible is false", async () => {
		// Arrange
		const el = createDiv();
		const options = {
			...createOptions(),
			floatOnMount: true,
			dismissible: false,
		};

		// Act
		await createPopover(el, options);

		// Assert
		expect(
			within(el).queryByRole("button", { name: "Close" }),
		).not.toBeInTheDocument();
	});

	it("marks the popover as dragging when a pointer down starts a drag", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = within(el).getByRole("group");
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

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-dragging");
	});

	it("moves a floating popover by dragging it", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = within(el).getByRole("group");
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 200,
			width: 250,
			height: 150,
		} as DOMRect);
		await user.click(popover);
		fireEvent.pointerDown(popover, {
			pointerId: 1,
			clientX: 120,
			clientY: 230,
		});

		// Act
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
		expect(popover).toHaveClass("interval-timer-popover-moved");
	});

	it("accounts for a fixed-position origin offset when dragging", async () => {
		// Arrange
		const el = createDiv();
		const options = { ...createOptions(), floatOnMount: true };
		await createPopover(el, options);
		const popover = within(el).getByRole("group");
		const computedStyleSpy = mockComputedStyleFor(popover, {
			left: "50px",
			top: "60px",
		});
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 90,
			top: 100,
			width: 250,
			height: 150,
		} as DOMRect);

		// Act
		fireEvent.pointerDown(popover, {
			pointerId: 1,
			clientX: 110,
			clientY: 140,
		});
		computedStyleSpy.mockRestore();
		fireEvent.pointerMove(popover, {
			pointerId: 1,
			clientX: 210,
			clientY: 240,
		});
		fireEvent.pointerUp(popover, { pointerId: 1 });

		// Assert
		expect(popover).toHaveStyle({
			left: "150px",
			top: "160px",
		});
	});

	it("hides the return button until the popover is moved", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = within(el).getByRole("group");
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 200,
			width: 250,
			height: 150,
		} as DOMRect);

		// Act
		await user.click(popover);

		// Assert
		expect(within(el).getByTestId("popover-return")).toHaveProperty(
			"tabIndex",
			-1,
		);
		expect(popover).not.toHaveClass("interval-timer-popover-moved");
	});

	it("returns a moved popover to its original position", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = within(el).getByRole("group");
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 200,
			width: 250,
			height: 150,
		} as DOMRect);
		await user.click(popover);
		fireEvent.pointerDown(popover, {
			pointerId: 1,
			clientX: 120,
			clientY: 230,
		});
		fireEvent.pointerMove(popover, {
			pointerId: 1,
			clientX: 320,
			clientY: 330,
		});
		fireEvent.pointerUp(popover, { pointerId: 1 });

		// Act
		await user.click(
			within(el).getByRole("button", {
				name: "Return to original position",
			}),
		);

		// Assert
		expect(popover).toHaveStyle({ left: "100px", top: "200px" });
		expect(popover).not.toHaveClass("interval-timer-popover-moved");
	});

	it("records the resting position as the return target when floating from mount", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const options = { ...createOptions(), floatOnMount: true };
		await createPopover(el, options);
		const popover = within(el).getByRole("group");
		const computedStyleSpy = mockComputedStyleFor(popover, {
			left: "50px",
			top: "60px",
		});
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 90,
			top: 100,
			width: 250,
			height: 150,
		} as DOMRect);
		fireEvent.pointerDown(popover, {
			pointerId: 1,
			clientX: 110,
			clientY: 140,
		});
		computedStyleSpy.mockRestore();
		fireEvent.pointerMove(popover, {
			pointerId: 1,
			clientX: 210,
			clientY: 240,
		});
		fireEvent.pointerUp(popover, { pointerId: 1 });

		// Act
		await user.click(
			within(el).getByRole("button", {
				name: "Return to original position",
			}),
		);

		// Assert
		expect(popover).toHaveStyle({ left: "50px", top: "60px" });
		expect(popover).not.toHaveClass("interval-timer-popover-moved");
	});

	it("does not start dragging from a popover control", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = within(el).getByRole("group");
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
		const close = within(el).getByTestId("popover-close");

		// Assert
		expect(close).toHaveProperty("tabIndex", -1);
	});

	it("adds the visible close button to the tab order when floating", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = within(el).getByRole("group");

		// Act
		await user.click(popover);

		// Assert
		const close = within(el).getByRole("button", { name: "Close" });
		expect(close).toHaveProperty("tabIndex", 0);
	});

	it("keeps a floating popover open after the pointer leaves", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		await createPopover(el);
		const popover = within(el).getByRole("group");
		await user.click(popover);

		// Act
		fireEvent.mouseLeave(el);

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-floating");
	});

	it("starts the closing animation when the close button is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const options = createOptions({ left: 925, top: 710 });
		await createPopover(el, options);
		const popover = within(el).getByRole("group");
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
		expect(options.onFloatingChange).toHaveBeenLastCalledWith(true);
	});

	it("dismisses immediately without animating when reduced motion is preferred", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const options = createOptions({ left: 925, top: 710 });
		await createPopover(el, options);
		const popover = within(el).getByRole("group");
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 200,
			width: 250,
			height: 150,
		} as DOMRect);
		vi.spyOn(window, "matchMedia").mockReturnValue({
			matches: true,
		} as MediaQueryList);
		await user.click(popover);

		// Act
		await user.click(within(el).getByRole("button", { name: "Close" }));

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-dismissed");
		expect(popover).not.toHaveClass("interval-timer-popover-returning");
		expect(options.onFloatingChange).toHaveBeenLastCalledWith(false);
	});

	it("dismisses a floating popover once its closing animation finishes", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const options = createOptions({ left: 925, top: 710 });
		await createPopover(el, options);
		const popover = within(el).getByRole("group");
		vi.spyOn(popover, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 200,
			width: 250,
			height: 150,
		} as DOMRect);
		await user.click(popover);
		await user.click(within(el).getByRole("button", { name: "Close" }));

		// Act
		fireEvent.transitionEnd(popover, { propertyName: "transform" });

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-dismissed");
		expect(options.onFloatingChange).toHaveBeenLastCalledWith(false);
		// eslint-disable-next-line jest-dom/prefer-to-have-style -- toHaveStyle can't assert that inline styles were cleared
		expect(popover).toHaveAttribute("style", "");
	});

	it("starts the closing animation when Enter is pressed on a focused close button", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const options = createOptions();
		await createPopover(el, options);
		const popover = within(el).getByRole("group");
		await user.click(popover);
		const close = within(el).getByRole("button", { name: "Close" });
		close.focus();

		// Act
		await user.keyboard("{Enter}");

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-returning");
	});

	it("restores compact focus after closing from the keyboard", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const options = createOptions();
		await createPopover(el, options);
		const popover = within(el).getByRole("group");
		await user.click(popover);
		const close = within(el).getByRole("button", { name: "Close" });
		close.focus();
		await user.keyboard("{Enter}");

		// Act
		fireEvent.transitionEnd(popover, { propertyName: "transform" });

		// Assert
		expect(popover).toHaveClass("interval-timer-popover-dismissed");
		await waitFor(() => {
			expect(options.onRestoreFocus).toHaveBeenCalled();
		});
	});

	it("clears dismissal when focus returns to the status item", async () => {
		// Arrange
		const user = userEvent.setup();
		const el = createDiv();
		const focusTarget = createEl("button");
		el.append(focusTarget);
		await createPopover(el);
		const popover = within(el).getByRole("group");
		await user.click(popover);
		await user.click(within(el).getByRole("button", { name: "Close" }));

		// Act
		await user.click(focusTarget);

		// Assert
		expect(popover).not.toHaveClass("interval-timer-popover-dismissed");
	});
});
