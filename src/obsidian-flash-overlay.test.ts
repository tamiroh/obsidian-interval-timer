import { describe, expect, it, afterEach } from "vitest";
import { FlashOverlay } from "./obsidian-flash-overlay";

const flashColor = (element: Element | null): string | undefined =>
	(element as HTMLElement | null)?.style.getPropertyValue(
		"--interval-timer-flash-color",
	);

describe("FlashOverlay", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("should create overlay element when show is called", () => {
		// Arrange
		const flashOverlay = new FlashOverlay();

		// Act
		flashOverlay.show({ r: 255, g: 100, b: 100 });

		// Assert
		const overlay = document.querySelector(".interval-timer-flash-overlay");
		expect(overlay).not.toBeNull();
		expect(flashColor(overlay)).toBe("rgba(255, 100, 100, 0.9)");
	});

	it("should not create multiple overlays when show is called twice", () => {
		// Arrange
		const flashOverlay = new FlashOverlay();

		// Act
		flashOverlay.show({ r: 100, g: 150, b: 255 });
		flashOverlay.show({ r: 100, g: 150, b: 255 });

		// Assert
		const overlays = document.querySelectorAll(
			".interval-timer-flash-overlay",
		);
		expect(overlays.length).toBe(1);
	});

	it("should update overlay color when show is called with different color", () => {
		// Arrange
		const flashOverlay = new FlashOverlay();
		flashOverlay.show({ r: 255, g: 100, b: 100 });

		// Act
		flashOverlay.show({ r: 100, g: 255, b: 100 });

		// Assert
		const overlay = document.querySelector(
			".interval-timer-flash-overlay",
		) as Element;
		const overlays = document.querySelectorAll(
			".interval-timer-flash-overlay",
		);
		expect(overlay).not.toBeNull();
		expect(flashColor(overlay)).toBe("rgba(100, 255, 100, 0.9)");
		expect(overlays.length).toBe(1);
	});

	it("should remove overlay when hide is called", () => {
		// Arrange
		const flashOverlay = new FlashOverlay();
		flashOverlay.show({ r: 255, g: 100, b: 100 });

		// Act
		flashOverlay.hide();

		// Assert
		const overlay = document.querySelector(".interval-timer-flash-overlay");
		expect(overlay).toBeNull();
	});

	it("should remove overlay when dispose is called", () => {
		// Arrange
		const flashOverlay = new FlashOverlay();
		flashOverlay.show({ r: 100, g: 255, b: 100 });

		// Act
		flashOverlay.dispose();

		// Assert
		const overlay = document.querySelector(".interval-timer-flash-overlay");
		expect(overlay).toBeNull();
	});

	it("should remove overlay when clicked", () => {
		// Arrange
		const flashOverlay = new FlashOverlay();
		flashOverlay.show({ r: 255, g: 100, b: 100 });
		const overlay = document.querySelector(
			".interval-timer-flash-overlay",
		) as HTMLElement;

		// Act
		overlay.click();

		// Assert
		const overlayAfterClick = document.querySelector(
			".interval-timer-flash-overlay",
		);
		expect(overlayAfterClick).toBeNull();
	});

	it("should handle dispose without showing overlay", () => {
		// Arrange
		const flashOverlay = new FlashOverlay();

		// Act & Assert
		expect(() => {
			flashOverlay.dispose();
		}).not.toThrow();
	});

	it("should handle hide without showing overlay", () => {
		// Arrange
		const flashOverlay = new FlashOverlay();

		// Act & Assert
		expect(() => {
			flashOverlay.hide();
		}).not.toThrow();
	});
});
