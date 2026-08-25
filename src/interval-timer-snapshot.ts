import {
	intervalTimerStates,
	type IntervalTimerState,
	type Snapshot,
} from "./interval-timer";
import { type KeyValueStore } from "./key-value-store";
import * as v from "valibot";
import { isMinutes, isSeconds, time, type Time } from "./time";

const snapshotKey = "snapshot";

const intervalCountSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

const snapshotSchema = v.pipe(
	v.object({
		state: v.picklist(intervalTimerStates),
		minutes: v.pipe(v.number(), v.integer(), v.guard(isMinutes)),
		seconds: v.pipe(v.number(), v.integer(), v.guard(isSeconds)),
		focusIntervals: v.object({
			total: intervalCountSchema,
			set: intervalCountSchema,
		}),
	}),
	v.check(({ focusIntervals }) => focusIntervals.set <= focusIntervals.total),
);

export class IntervalTimerSnapshotStore {
	private readonly keyValueStore: KeyValueStore;

	constructor(keyValueStore: KeyValueStore) {
		this.keyValueStore = keyValueStore;
	}

	public load(): Snapshot | null {
		const result = v.safeParse(
			snapshotSchema,
			this.keyValueStore.get(snapshotKey)?.as("object"),
		);
		if (!result.success) {
			return null;
		}

		return {
			...time(result.output.minutes, result.output.seconds),
			state: result.output.state,
			focusIntervals: result.output.focusIntervals,
		};
	}

	public save(
		state: IntervalTimerState,
		currentTime: Time,
		focusIntervals: { total: number; set: number },
	): void {
		this.keyValueStore.set(snapshotKey, {
			state,
			minutes: currentTime.minutes,
			seconds: currentTime.seconds,
			focusIntervals: {
				total: focusIntervals.total,
				set: focusIntervals.set,
			},
		});
	}
}
