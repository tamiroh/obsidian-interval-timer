import { describe, expect, expectTypeOf, it } from "vitest";
import {
	defaultPluginSetting,
	PluginSettingStore,
	type PluginSetting,
} from "./obsidian-plugin-setting";

describe("PluginSettingStore.loadFromUnknown", () => {
	it("returns defaults when stored data is missing", () => {
		expect(loadFromUnknown(null)).toEqual(defaultPluginSetting);
	});

	it("loads valid stored settings", () => {
		expect(
			loadFromUnknown({
				focusIntervalDuration: 50,
				shortBreakDuration: 10,
				longBreakDuration: 30,
				longBreakAfter: 3,
				notificationStyle: "system",
				flashOverlayEnabled: true,
				focusTickSoundVolume: 65,
				intervalCompletionBehavior: "countDownPastZero",
				focusBgmType: "whiteNoise",
				focusBgmVolume: 40,
				timeUpSoundVolume: 30,
			}),
		).toEqual({
			focusIntervalDuration: 50,
			shortBreakDuration: 10,
			longBreakDuration: 30,
			longBreakAfter: 3,
			notificationStyle: "system",
			flashOverlayEnabled: true,
			focusTickSoundVolume: 65,
			intervalCompletionBehavior: "countDownPastZero",
			focusBgmType: "whiteNoise",
			focusBgmVolume: 40,
			timeUpSoundVolume: 30,
		});
	});

	it("replaces only invalid settings with defaults", () => {
		expect(
			loadFromUnknown({
				focusIntervalDuration: 0,
				shortBreakDuration: -1,
				longBreakDuration: 7.5,
				longBreakAfter: "invalid",
				notificationStyle: "unknown",
				flashOverlayEnabled: "yes",
				focusTickSoundVolume: 101,
				intervalCompletionBehavior: "unknown",
				focusBgmType: "unknown",
				focusBgmVolume: 101,
				timeUpSoundVolume: 101,
			}),
		).toEqual(defaultPluginSetting);
	});

	it("preserves valid settings when other fields are invalid", () => {
		expect(
			loadFromUnknown({
				focusIntervalDuration: 45,
				notificationStyle: "unknown",
			}),
		).toEqual({
			...defaultPluginSetting,
			focusIntervalDuration: 45,
		});
	});

	it("normalizes numeric strings from older stored data", () => {
		expect(
			loadFromUnknown({
				focusIntervalDuration: "30",
			}),
		).toEqual({
			...defaultPluginSetting,
			focusIntervalDuration: 30,
		});
	});
});

const loadFromUnknown = (value: unknown) => {
	const store = new PluginSettingStore(defaultPluginSetting);
	store.loadFromUnknown(value);
	return store.state;
};

describe("PluginSettingStore", () => {
	it("passes only the selected settings to a reload callback", () => {
		const store = new PluginSettingStore(defaultPluginSetting);
		let reloaded: unknown;
		store.subscribeReloads((on) => [
			on(["notificationStyle"], (next) => {
				expectTypeOf(next).toEqualTypeOf<
					Readonly<Pick<PluginSetting, "notificationStyle">>
				>();
				reloaded = next;
			}),
		]);

		store.update({ longBreakAfter: 3 });
		store.update({ notificationStyle: "system" });

		expect(reloaded).toEqual({ notificationStyle: "system" });
	});

	it("passes every selected setting when any of them changes", () => {
		const store = new PluginSettingStore(defaultPluginSetting);
		const reloads: unknown[] = [];
		store.subscribeReloads((on) => [
			on(["focusBgmType", "focusBgmVolume"], (next) => {
				reloads.push(next);
			}),
		]);

		store.update({ focusBgmVolume: 75 });

		expect(reloads).toEqual([{ focusBgmType: "none", focusBgmVolume: 75 }]);
	});

	it("stops reload callbacks after unsubscribing", () => {
		const store = new PluginSettingStore(defaultPluginSetting);
		let called = false;
		const unsubscribe = store.subscribeReloads((on) => [
			on(["notificationStyle"], () => {
				called = true;
			}),
		]);

		unsubscribe();
		store.update({ notificationStyle: "system" });

		expect(called).toBe(false);
	});

	it("updates a valid duration from an unknown value", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.updateFromUnknown("focusIntervalDuration", "30");

		expect(result).toEqual({ ok: true, value: 30 });
		expect(store.state.focusIntervalDuration).toBe(30);
	});

	it("rejects an invalid duration from an unknown value", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.updateFromUnknown(
			"focusIntervalDuration",
			"not-a-number",
		);

		expect(result).toEqual({ ok: false, reason: "invalid_number" });
		expect(store.state.focusIntervalDuration).toBe(
			defaultPluginSetting.focusIntervalDuration,
		);
	});

	it("rejects an invalid notification style", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.updateFromUnknown(
			"notificationStyle",
			"unsupported",
		);

		expect(result).toEqual({ ok: false, reason: "invalid_option" });
	});

	it("updates a valid interval completion behavior from an unknown value", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.updateFromUnknown(
			"intervalCompletionBehavior",
			"countDownPastZero",
		);

		expect(result).toEqual({ ok: true, value: "countDownPastZero" });
		expect(store.state.intervalCompletionBehavior).toBe(
			"countDownPastZero",
		);
	});

	it("rejects an invalid interval completion behavior from an unknown value", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.updateFromUnknown(
			"intervalCompletionBehavior",
			"unsupported",
		);

		expect(result).toEqual({ ok: false, reason: "invalid_option" });
		expect(store.state.intervalCompletionBehavior).toBe(
			defaultPluginSetting.intervalCompletionBehavior,
		);
	});

	it("updates a valid boolean from an unknown value", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.updateFromUnknown("flashOverlayEnabled", true);

		expect(result).toEqual({ ok: true, value: true });
		expect(store.state.flashOverlayEnabled).toBe(true);
	});

	it("rejects an invalid boolean from an unknown value", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.updateFromUnknown("flashOverlayEnabled", "yes");

		expect(result).toEqual({ ok: false, reason: "invalid_option" });
		expect(store.state.flashOverlayEnabled).toBe(
			defaultPluginSetting.flashOverlayEnabled,
		);
	});

	it("updates a valid volume from an unknown value", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.updateFromUnknown("focusTickSoundVolume", 65);

		expect(result).toEqual({ ok: true, value: 65 });
		expect(store.state.focusTickSoundVolume).toBe(65);
	});

	it("rejects an out-of-range volume from an unknown value", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.updateFromUnknown("focusTickSoundVolume", 101);

		expect(result).toEqual({
			ok: false,
			reason: "out_of_range_volume",
		});
		expect(store.state.focusTickSoundVolume).toBe(
			defaultPluginSetting.focusTickSoundVolume,
		);
	});

	it("returns the validated patch after a typed update", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.update({ focusBgmVolume: 80 });

		expect(result).toEqual({
			ok: true,
			value: { focusBgmVolume: 80 },
		});
		expect(store.state.focusBgmVolume).toBe(80);
	});

	it("validates a typed update before changing the current settings", () => {
		const store = new PluginSettingStore(defaultPluginSetting);

		const result = store.update({ focusBgmVolume: 101 });

		expect(result).toEqual({
			ok: false,
			reason: "out_of_range_volume",
		});
		expect(store.state.focusBgmVolume).toBe(
			defaultPluginSetting.focusBgmVolume,
		);
	});

	it("rejects an undefined value without touching the current setting", () => {
		const store = new PluginSettingStore({
			...defaultPluginSetting,
			focusBgmVolume: 80,
		});

		const result = store.updateFromUnknown("focusBgmVolume", undefined);

		expect(result).toEqual({ ok: false, reason: "invalid_number" });
		expect(store.state.focusBgmVolume).toBe(80);
	});
});
