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

	it.each([
		["timerState", "invalid"],
		["time-minutes", "NaN"],
		["time-minutes", "-1"],
		["time-minutes", "1.5"],
		["time-seconds", "60"],
		["time-seconds", "-1"],
		["time-seconds", "1.5"],
		["intervals-total", "-1"],
		["intervals-total", "1.5"],
		["intervals-set", "-1"],
		["intervals-set", "1.5"],
	])("should return null when %s is invalid", (key, value) => {
		const keyValueStore = new KeyValueStore("snapshot-test");
		const snapshotStore = new IntervalTimerSnapshotStore(keyValueStore);
		keyValueStore.set("timerState", "focus");
		keyValueStore.set("time-minutes", "25");
		keyValueStore.set("time-seconds", "0");
		keyValueStore.set("intervals-total", "4");
		keyValueStore.set("intervals-set", "2");
		keyValueStore.set(key, value);

		const snapshot = snapshotStore.load();

		expect(snapshot).toBeNull();
	});

	it("should return null when intervals set is greater than total", () => {
		const keyValueStore = new KeyValueStore("snapshot-test");
		const snapshotStore = new IntervalTimerSnapshotStore(keyValueStore);
		keyValueStore.set("timerState", "focus");
		keyValueStore.set("time-minutes", "25");
		keyValueStore.set("time-seconds", "0");
		keyValueStore.set("intervals-total", "1");
		keyValueStore.set("intervals-set", "2");

		const snapshot = snapshotStore.load();

		expect(snapshot).toBeNull();
	});
});
