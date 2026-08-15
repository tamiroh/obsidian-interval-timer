import { describe, expect, it, vi } from "vitest";
import { ObservableStore } from "./observable-store";

describe("ObservableStore", () => {
	it("updates an immutable state and notifies subscribers", () => {
		// Arrange
		const store = new ObservableStore({ count: 1, label: "Focus" });
		const initialState = store.state;
		const listener = vi.fn();
		store.subscribe(listener);

		// Act
		store.update({ count: 2 });

		// Assert
		expect(store.state).toEqual({ count: 2, label: "Focus" });
		expect(store.state).not.toBe(initialState);
		expect(listener).toHaveBeenCalledOnce();
	});

	it("stops notifying an unsubscribed listener", () => {
		// Arrange
		const store = new ObservableStore({ count: 1 });
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);

		// Act
		unsubscribe();
		store.update({ count: 2 });

		// Assert
		expect(listener).not.toHaveBeenCalled();
	});
});
