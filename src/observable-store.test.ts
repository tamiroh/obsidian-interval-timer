import { describe, expect, it, vi } from "vitest";
import { ObservableStore } from "./observable-store";

describe("ObservableStore", () => {
	it("updates an immutable snapshot and notifies subscribers", () => {
		const store = new ObservableStore({ count: 1, label: "Focus" });
		const initialSnapshot = store.getSnapshot();
		const listener = vi.fn();
		store.subscribe(listener);

		store.update({ count: 2 });

		expect(store.getSnapshot()).toEqual({ count: 2, label: "Focus" });
		expect(store.getSnapshot()).not.toBe(initialSnapshot);
		expect(listener).toHaveBeenCalledOnce();
	});

	it("stops notifying an unsubscribed listener", () => {
		const store = new ObservableStore({ count: 1 });
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);

		unsubscribe();
		store.update({ count: 2 });

		expect(listener).not.toHaveBeenCalled();
	});
});
