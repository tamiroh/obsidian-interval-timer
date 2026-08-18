import { describe, expect, it } from "vitest";
import {
	defaultPluginSetting,
	parsePluginSetting,
	PluginSettingStore,
} from "./obsidian-plugin-setting";

describe("parsePluginSetting", () => {
	it("returns defaults when stored data is missing", () => {
		expect(parsePluginSetting(null)).toEqual(defaultPluginSetting);
	});

	it("loads valid stored settings", () => {
		expect(
			parsePluginSetting({
				focusIntervalDuration: 50,
				shortBreakDuration: 10,
				longBreakDuration: 30,
				longBreakAfter: 3,
				notificationStyle: "system",
				flashOverlayEnabled: true,
				focusTickSoundVolume: 65,
				focusBgmType: "whiteNoise",
				focusBgmVolume: 40,
			}),
		).toEqual({
			focusIntervalDuration: 50,
			shortBreakDuration: 10,
			longBreakDuration: 30,
			longBreakAfter: 3,
			notificationStyle: "system",
			flashOverlayEnabled: true,
			focusTickSoundVolume: 65,
			focusBgmType: "whiteNoise",
			focusBgmVolume: 40,
		});
	});

	it("replaces only invalid settings with defaults", () => {
		expect(
			parsePluginSetting({
				focusIntervalDuration: 0,
				shortBreakDuration: -1,
				longBreakDuration: 7.5,
				longBreakAfter: "invalid",
				notificationStyle: "unknown",
				flashOverlayEnabled: "yes",
				focusTickSoundVolume: 101,
				focusBgmType: "unknown",
				focusBgmVolume: 101,
			}),
		).toEqual(defaultPluginSetting);
	});

	it("preserves valid settings when other fields are invalid", () => {
		expect(
			parsePluginSetting({
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
			parsePluginSetting({
				focusIntervalDuration: "30",
			}),
		).toEqual({
			...defaultPluginSetting,
			focusIntervalDuration: 30,
		});
	});
});

describe("PluginSettingStore", () => {
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
