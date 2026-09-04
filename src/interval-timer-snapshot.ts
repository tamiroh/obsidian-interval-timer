import { intervalTimerStates, type Snapshot } from "./interval-timer";
import { type KeyValueStore } from "./key-value-store";
import * as v from "valibot";
import * as t from "./time";

const snapshotKey = "snapshot";

const intervalCountSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

const snapshotSchema = v.pipe(
	v.object({
		state: v.picklist(intervalTimerStates),
		minutes: v.pipe(v.number(), v.integer(), v.guard(t.isMinutes)),
		seconds: v.pipe(v.number(), v.integer(), v.guard(t.isSeconds)),
		sign: v.optional(v.picklist([1, -1] as const), 1),
		nextState: v.optional(v.picklist(intervalTimerStates)),
		focusIntervals: v.object({
			total: intervalCountSchema,
			set: intervalCountSchema,
		}),
	}),
	v.check(
		({ minutes, seconds, sign }) =>
			sign === 1 || minutes > 0 || seconds > 0,
	),
	v.check(({ sign, nextState }) => sign === 1 || nextState !== undefined),
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

		const { state, minutes, seconds, sign, nextState, focusIntervals } =
			result.output;
		const currentTime = t.fromSeconds(sign * (minutes * 60 + seconds));
		if (currentTime === null) {
			return null;
		}

		return {
			...currentTime,
			state,
			...(nextState ? { nextState } : {}),
			focusIntervals,
		};
	}

	public save(snapshot: Snapshot): void {
		this.keyValueStore.set(snapshotKey, {
			state: snapshot.state,
			minutes: snapshot.minutes,
			seconds: snapshot.seconds,
			sign: snapshot.sign,
			...(snapshot.nextState ? { nextState: snapshot.nextState } : {}),
			focusIntervals: {
				total: snapshot.focusIntervals.total,
				set: snapshot.focusIntervals.set,
			},
		});
	}
}
