import { describe, expect, it, afterEach } from "vitest";
import { FlashOverlay } from "./flash-overlay";

describe("FlashOverlay", () => {
	afterEach(() => {
		FlashOverlay.dispose();
		document.body.innerHTML = "";
		document.head.innerHTML = "";
	});

	it("should create overlay element when show is called", () => {
		// Arrange
		const flashOverlay = FlashOverlay.getInstance();

		// Act
		flashOverlay.show({ r: 255, g: 100, b: 100 });

		// Assert
		const overlay = document.querySelector(".interval-timer-flash-overlay");
		expect(overlay).not.toBeNull();
		expect(overlay?.getAttribute("style")).toContain(
			"background-color: rgba(255, 100, 100, 0.9)",
		);
	});

	it("should inject the overlay styles and keyframes on first show", () => {
		// Arrange
		const flashOverlay = FlashOverlay.getInstance();

		// Act
		flashOverlay.show({ r: 100, g: 255, b: 100 });

		// Assert
		const styleElement = document.head.querySelector("style");
		expect(styleElement).not.toBeNull();
		expect(styleElement?.textContent).toContain(
			".interval-timer-flash-overlay",
		);
		expect(styleElement?.textContent).toContain("@keyframes flash-fade");
	});

	it("should not create multiple overlays when show is called twice", () => {
		// Arrange
		const flashOverlay = FlashOverlay.getInstance();

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
		const flashOverlay = FlashOverlay.getInstance();
		flashOverlay.show({ r: 255, g: 100, b: 100 });

		// Act
		flashOverlay.show({ r: 100, g: 255, b: 100 });

		// Assert
		const overlay = document.querySelector(
			".interval-timer-flash-overlay",
		) as HTMLDivElement;
		expect(overlay).not.toBeNull();
		expect(overlay.style.backgroundColor).toBe("rgba(100, 255, 100, 0.9)");
		const overlays = document.querySelectorAll(
			".interval-timer-flash-overlay",
		);
		expect(overlays.length).toBe(1);
	});

	it("should remove overlay when hide is called", () => {
		// Arrange
		const flashOverlay = FlashOverlay.getInstance();
		flashOverlay.show({ r: 255, g: 100, b: 100 });

		// Act
		flashOverlay.hide();

		// Assert
		const overlay = document.querySelector(".interval-timer-flash-overlay");
		expect(overlay).toBeNull();
	});

	it("should remove overlay and style element when dispose is called", () => {
		// Arrange
		const flashOverlay = FlashOverlay.getInstance();
		flashOverlay.show({ r: 100, g: 255, b: 100 });

		// Act
		FlashOverlay.dispose();

		// Assert
		const styleElement = document.head.querySelector("style");
		expect(styleElement).toBeNull();
		const overlay = document.querySelector(".interval-timer-flash-overlay");
		expect(overlay).toBeNull();
	});

	it("should remove overlay when clicked", () => {
		// Arrange
		const flashOverlay = FlashOverlay.getInstance();
		flashOverlay.show({ r: 255, g: 100, b: 100 });
		const overlay = document.querySelector(
			".interval-timer-flash-overlay",
		) as HTMLDivElement;

		// Act
		overlay.click();

		// Assert
		const overlayAfterClick = document.querySelector(
			".interval-timer-flash-overlay",
		);
		expect(overlayAfterClick).toBeNull();
	});

	it("should handle dispose without showing overlay", () => {
		// Arrange & Act & Assert
		expect(() => FlashOverlay.dispose()).not.toThrow();
	});

	it("should handle hide without showing overlay", () => {
		// Arrange
		const flashOverlay = FlashOverlay.getInstance();

		// Act & Assert
		expect(() => flashOverlay.hide()).not.toThrow();
	});
});
