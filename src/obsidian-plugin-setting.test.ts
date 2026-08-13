import { describe, expect, it } from "vitest";
import {
	defaultPluginSetting,
	parsePluginSetting,
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
				intervalCompletionBehavior: "countDownPastZero",
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
				intervalCompletionBehavior: "unknown",
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
