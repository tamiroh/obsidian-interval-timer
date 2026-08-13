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

setupObsidianGlobals();
