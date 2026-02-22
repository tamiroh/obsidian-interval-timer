import { IntervalTimerState, Snapshot } from "./interval-timer";
import { KeyValueStore } from "./key-value-store";
import { Time, ensureMinutes, ensureSeconds } from "./time";

export class IntervalTimerSnapshotStore {
	private readonly keyValueStore: KeyValueStore;

	constructor(keyValueStore: KeyValueStore) {
		this.keyValueStore = keyValueStore;
	}

	public load(): Snapshot | null {
		const state = this.keyValueStore.get("timerState");
		const minutes = this.keyValueStore.get("time-minutes");
		const seconds = this.keyValueStore.get("time-seconds");
		const total = this.keyValueStore.get("intervals-total");
		const set = this.keyValueStore.get("intervals-set");
		if (
			state === null ||
			minutes === null ||
			seconds === null ||
			total === null ||
			set === null
		) {
			return null;
		}

		try {
			return {
				state: state as IntervalTimerState,
				minutes: ensureMinutes(Number.parseInt(minutes, 10)),
				seconds: ensureSeconds(Number.parseInt(seconds, 10)),
				focusIntervals: {
					total: Number.parseInt(total, 10),
					set: Number.parseInt(set, 10),
				},
			};
		} catch {
			return null;
		}
	}

	public save(
		state: IntervalTimerState,
		time: Time,
		focusIntervals: { total: number; set: number },
	): void {
		this.keyValueStore.set("timerState", state);
		this.keyValueStore.set("time-minutes", String(time.minutes));
		this.keyValueStore.set("time-seconds", String(time.seconds));
		this.keyValueStore.set("intervals-set", String(focusIntervals.set));
		this.keyValueStore.set("intervals-total", String(focusIntervals.total));
	}
}
