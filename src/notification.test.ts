import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SystemNotifier } from "./notification";

class FakeNotification extends EventTarget {
	public static instances: FakeNotification[] = [];

	public closed = false;

	constructor(public readonly title: string) {
		super();
		FakeNotification.instances.push(this);
	}

	public close(): void {
		this.closed = true;
		this.dispatchEvent(new Event("close"));
	}
}

const blurWindow = (): void => {
	vi.spyOn(document, "hasFocus").mockReturnValue(false);
};

const focusWindow = (): void => {
	vi.spyOn(document, "hasFocus").mockReturnValue(true);
	window.dispatchEvent(new Event("focus"));
};

describe("SystemNotifier", () => {
	beforeEach(() => {
		FakeNotification.instances = [];
		vi.stubGlobal("Notification", FakeNotification);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("closes the current notification when the window regains focus", () => {
		// Arrange
		blurWindow();
		const notifier = new SystemNotifier();
		notifier.enableAutoClear();
		notifier.notify("Now it's time to focus");

		// Act
		focusWindow();

		// Assert
		expect(FakeNotification.instances[0]?.closed).toBe(true);

		notifier.dispose();
	});

	it("keeps the notification open until auto clear is enabled", () => {
		// Arrange
		blurWindow();
		const notifier = new SystemNotifier();
		notifier.notify("Now it's time to focus");

		// Act
		focusWindow();

		// Assert
		expect(FakeNotification.instances[0]?.closed).toBe(false);

		notifier.dispose();
	});

	it("stops closing notifications once disposed", () => {
		// Arrange
		blurWindow();
		const notifier = new SystemNotifier();
		notifier.enableAutoClear();
		notifier.dispose();
		notifier.notify("Now it's time to focus");

		// Act
		focusWindow();

		// Assert
		expect(FakeNotification.instances[0]?.closed).toBe(false);
	});

	it("closes the current notification when disposed", () => {
		// Arrange
		blurWindow();
		const notifier = new SystemNotifier();
		notifier.notify("Now it's time to focus");

		// Act
		notifier.dispose();

		// Assert
		expect(FakeNotification.instances[0]?.closed).toBe(true);
	});

	it("does not notify while the window has focus", () => {
		// Arrange
		focusWindow();
		const notifier = new SystemNotifier();

		// Act
		notifier.notify("Now it's time to focus");

		// Assert
		expect(FakeNotification.instances).toEqual([]);

		notifier.dispose();
	});
});
