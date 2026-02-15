import { beforeEach, describe, expect, it } from "vitest";
import { KeyValueStore } from "./key-value-store";
import { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";

describe("IntervalTimerSnapshotStore", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("should return null when state is missing", () => {
		const snapshotStore = new IntervalTimerSnapshotStore(
			new KeyValueStore("snapshot-test"),
		);

		const snapshot = snapshotStore.load();

		expect(snapshot).toBeNull();
	});

	it("should save and load snapshot", () => {
		const snapshotStore = new IntervalTimerSnapshotStore(
			new KeyValueStore("snapshot-test"),
		);

		snapshotStore.save(
			"shortBreak",
			{ minutes: 3, seconds: 20 },
			{ total: 7, set: 2 },
		);
		const snapshot = snapshotStore.load();

		expect(snapshot).toEqual({
			state: "shortBreak",
			minutes: 3,
			seconds: 20,
			focusIntervals: { total: 7, set: 2 },
		});
	});

	it("should return null when any field is missing", () => {
		const keyValueStore = new KeyValueStore("snapshot-test");
		const snapshotStore = new IntervalTimerSnapshotStore(keyValueStore);
		keyValueStore.set("timerState", "focus");

		const snapshot = snapshotStore.load();

		expect(snapshot).toBeNull();
	});
});
