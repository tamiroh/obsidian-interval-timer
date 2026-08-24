import {
	intervalTimerStates,
	type IntervalTimerState,
	type Snapshot,
} from "./interval-timer";
import { type KeyValueStore } from "./key-value-store";
import * as v from "valibot";
import { isMinutes, isSeconds, type Time } from "./time";

const snapshotKey = "snapshot";

const intervalCountSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

const snapshotSchema = v.pipe(
	v.object({
		state: v.picklist(intervalTimerStates),
		minutes: v.pipe(v.number(), v.integer(), v.guard(isMinutes)),
		seconds: v.pipe(v.number(), v.integer(), v.guard(isSeconds)),
		negative: v.optional(v.literal(true)),
		nextState: v.optional(v.picklist(intervalTimerStates)),
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
			state: result.output.state,
			minutes: result.output.minutes,
			seconds: result.output.seconds,
			...(result.output.negative === true ? { negative: true as const } : {}),
			...(result.output.nextState ? { nextState: result.output.nextState } : {}),
			focusIntervals: result.output.focusIntervals,
		};
	}

	public save(
		state: IntervalTimerState,
		time: Time & { nextState?: IntervalTimerState },
		focusIntervals: { total: number; set: number },
	): void {
		this.keyValueStore.set(snapshotKey, {
			state,
			minutes: time.minutes,
			seconds: time.seconds,
			...(time.negative ? { negative: true as const } : {}),
			...(time.nextState ? { nextState: time.nextState } : {}),
			focusIntervals: {
				total: focusIntervals.total,
				set: focusIntervals.set,
			},
		});
	}
}
