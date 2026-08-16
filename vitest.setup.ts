import "@testing-library/jest-dom/vitest";
import { options } from "preact";
import { setupObsidianGlobals } from "./src/obsidian-globals-fake";

// Flush Preact re-renders synchronously so tests can assert right after
// dispatching events, matching React's synchronous discrete-event flush.
options.debounceRendering = (callback) => callback();

// jsdom lacks the `ontransitionend` property that browsers have; Preact
// relies on it to lowercase the listener name for onTransitionEnd.
Object.defineProperty(HTMLElement.prototype, "ontransitionend", {
	value: null,
	writable: true,
});

// jsdom doesn't implement matchMedia; stub it so code can call it directly
// and tests can override matches via vi.spyOn(window, "matchMedia").
window.matchMedia = (query) =>
	({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	}) as MediaQueryList;

// jsdom doesn't implement the Pointer Capture API; stub it as a no-op so
// code can call it directly and tests can assert on it via vi.spyOn.
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
Element.prototype.hasPointerCapture = () => false;

setupObsidianGlobals();
