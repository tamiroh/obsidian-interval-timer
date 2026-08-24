import { beforeEach, describe, expect, it } from "vitest";
import { KeyValueStore } from "./key-value-store";
import { IntervalTimerSnapshotStore } from "./interval-timer-snapshot";
import { neg, time } from "./time";

const validStored = {
	state: "focus",
	minutes: 25,
	seconds: 0,
	focusIntervals: { total: 4, set: 2 },
};

describe("IntervalTimerSnapshotStore", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("should return null when nothing was saved", () => {
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
			{
				...neg(time(3, 20)),
				nextState: "focus",
			},
			{ total: 7, set: 2 },
		);
		const snapshot = snapshotStore.load();

		expect(snapshot).toEqual({
			state: "shortBreak",
			minutes: 3,
			seconds: 20,
			sign: -1,
			nextState: "focus",
			focusIntervals: { total: 7, set: 2 },
		});
	});

	it("should save the whole snapshot under a single key", () => {
		const snapshotStore = new IntervalTimerSnapshotStore(
			new KeyValueStore("snapshot-test"),
		);

		snapshotStore.save("shortBreak", time(3, 20), { total: 7, set: 2 });

		expect(Object.keys(window.localStorage)).toEqual([
			"snapshot-test:snapshot",
		]);
	});

	it("should return null when a field is missing", () => {
		const keyValueStore = new KeyValueStore("snapshot-test");
		const snapshotStore = new IntervalTimerSnapshotStore(keyValueStore);

		keyValueStore.set("snapshot", { state: "focus" });

		expect(snapshotStore.load()).toBeNull();
	});

	it.each([
		["state", { ...validStored, state: "invalid" }],
		["minutes", { ...validStored, minutes: Number.NaN }],
		["minutes", { ...validStored, minutes: -1 }],
		["minutes", { ...validStored, minutes: 1.5 }],
		["minutes", { ...validStored, minutes: "25" }],
		["minutes", { ...validStored, minutes: 600 }],
		["seconds", { ...validStored, seconds: 60 }],
		["seconds", { ...validStored, seconds: -1 }],
		["seconds", { ...validStored, seconds: 1.5 }],
		["focusIntervals", { ...validStored, focusIntervals: 4 }],
		["total", { ...validStored, focusIntervals: { total: -1, set: 0 } }],
		["total", { ...validStored, focusIntervals: { total: 1.5, set: 0 } }],
		["set", { ...validStored, focusIntervals: { total: 4, set: -1 } }],
		["set", { ...validStored, focusIntervals: { total: 4, set: 1.5 } }],
		["negative", { ...validStored, negative: false }],
		[
			"negative zero",
			{
				...validStored,
				minutes: 0,
				seconds: 0,
				negative: true,
				nextState: "shortBreak",
			},
		],
		["nextState", { ...validStored, negative: true }],
		["nextState", { ...validStored, nextState: "invalid" }],
	])("should return null when %s is invalid", (_field, stored) => {
		const keyValueStore = new KeyValueStore("snapshot-test");
		const snapshotStore = new IntervalTimerSnapshotStore(keyValueStore);

		keyValueStore.set("snapshot", stored);

		expect(snapshotStore.load()).toBeNull();
	});

	it("should reject overtime beyond the configured duration limit", () => {
		const keyValueStore = new KeyValueStore("snapshot-test");
		const snapshotStore = new IntervalTimerSnapshotStore(keyValueStore);
		keyValueStore.set("snapshot", {
			...validStored,
			minutes: 600,
			negative: true,
			nextState: "shortBreak",
		});

		expect(snapshotStore.load()).toBeNull();
	});

	it("should return null when intervals set is greater than total", () => {
		const keyValueStore = new KeyValueStore("snapshot-test");
		const snapshotStore = new IntervalTimerSnapshotStore(keyValueStore);

		keyValueStore.set("snapshot", {
			...validStored,
			focusIntervals: { total: 1, set: 2 },
		});

		expect(snapshotStore.load()).toBeNull();
	});
});
