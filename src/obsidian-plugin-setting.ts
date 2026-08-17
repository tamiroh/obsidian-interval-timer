import {
	parsePositiveInteger,
	type ParsePositiveIntegerResult,
} from "./value-parser";
import { isMinutes, type Minutes } from "./time";
import { defaultLongBreakAfter } from "./interval-timer";
import type { NotificationStyle } from "./notification";
import { focusBgmTypes, type FocusBgmType } from "./focus-bgm";
import { ObservableStore } from "./observable-store";
import { err, ok, type Result } from "./result";

export type PluginSetting = {
	focusIntervalDuration: Minutes;
	shortBreakDuration: Minutes;
	longBreakDuration: Minutes;
	longBreakAfter: number;
	notificationStyle: NotificationStyle;
	flashOverlayEnabled: boolean;
	focusTickSoundVolume: number;
	focusBgmType: FocusBgmType;
	focusBgmVolume: number;
};

export type PluginSettingUpdateResult =
	| Result<
			Minutes,
			"invalid_number" | "non_positive_integer" | "out_of_range_minutes"
	  >
	| ParsePositiveIntegerResult
	| Result<NotificationStyle, "invalid_notification_style">
	| Result<boolean, "invalid_boolean">
	| Result<number, "invalid_focus_tick_sound_volume">
	| Result<FocusBgmType, "invalid_focus_bgm_type">
	| Result<number, "invalid_focus_bgm_volume">;

export class PluginSettingStore extends ObservableStore<PluginSetting> {
	public override update(patch: Partial<PluginSetting>): void;
	public override update(
		key: keyof PluginSetting,
		value: unknown,
	): PluginSettingUpdateResult;
	public override update(
		patchOrKey: Partial<PluginSetting> | keyof PluginSetting,
		value?: unknown,
	): void | PluginSettingUpdateResult {
		if (typeof patchOrKey !== "string") {
			super.update(patchOrKey);
			return;
		}

		const key = patchOrKey;
		switch (key) {
			case "focusIntervalDuration":
			case "shortBreakDuration":
			case "longBreakDuration": {
				const parsed = parsePositiveInteger(value);
				if (!parsed.ok) return parsed;
				if (!isMinutes(parsed.value)) {
					return err("out_of_range_minutes");
				}

				super.update({ [key]: parsed.value });

				return ok(parsed.value);
			}
			case "longBreakAfter": {
				const parsed = parsePositiveInteger(value);
				if (!parsed.ok) return parsed;

				super.update({ longBreakAfter: parsed.value });

				return parsed;
			}
			case "notificationStyle": {
				if (!isNotificationStyle(value)) {
					return err("invalid_notification_style");
				}

				super.update({ notificationStyle: value });

				return ok(value);
			}
			case "flashOverlayEnabled": {
				if (typeof value !== "boolean") return err("invalid_boolean");

				super.update({ flashOverlayEnabled: value });

				return ok(value);
			}
			case "focusTickSoundVolume": {
				if (!isFocusTickSoundVolume(value)) {
					return err("invalid_focus_tick_sound_volume");
				}

				super.update({ focusTickSoundVolume: value });

				return ok(value);
			}
			case "focusBgmType": {
				if (!isFocusBgmType(value)) return err("invalid_focus_bgm_type");

				super.update({ focusBgmType: value });

				return ok(value);
			}
			case "focusBgmVolume": {
				if (!isFocusBgmVolume(value)) {
					return err("invalid_focus_bgm_volume");
				}

				super.update({ focusBgmVolume: value });

				return ok(value);
			}
		}
	}
}

export const focusTickSoundVolumeRange = { min: 0, max: 100 } as const;

export const focusBgmVolumeRange = { min: 0, max: 100 } as const;

export const defaultPluginSetting = {
	focusIntervalDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakAfter: defaultLongBreakAfter,
	notificationStyle: "simple",
	flashOverlayEnabled: false,
	focusTickSoundVolume: 0,
	focusBgmType: "none",
	focusBgmVolume: 50,
} satisfies PluginSetting;

export const parsePluginSetting = (value: unknown): PluginSetting => {
	const stored = isRecord(value) ? value : {};

	return {
		focusIntervalDuration: parseDurationOrDefault(
			stored.focusIntervalDuration,
			defaultPluginSetting.focusIntervalDuration,
		),
		shortBreakDuration: parseDurationOrDefault(
			stored.shortBreakDuration,
			defaultPluginSetting.shortBreakDuration,
		),
		longBreakDuration: parseDurationOrDefault(
			stored.longBreakDuration,
			defaultPluginSetting.longBreakDuration,
		),
		longBreakAfter: parsePositiveIntegerOrDefault(
			stored.longBreakAfter,
			defaultPluginSetting.longBreakAfter,
		),
		notificationStyle: isNotificationStyle(stored.notificationStyle)
			? stored.notificationStyle
			: defaultPluginSetting.notificationStyle,
		flashOverlayEnabled:
			typeof stored.flashOverlayEnabled === "boolean"
				? stored.flashOverlayEnabled
				: defaultPluginSetting.flashOverlayEnabled,
		focusTickSoundVolume: isFocusTickSoundVolume(
			stored.focusTickSoundVolume,
		)
			? stored.focusTickSoundVolume
			: defaultPluginSetting.focusTickSoundVolume,
		focusBgmType: isFocusBgmType(stored.focusBgmType)
			? stored.focusBgmType
			: defaultPluginSetting.focusBgmType,
		focusBgmVolume: isFocusBgmVolume(stored.focusBgmVolume)
			? stored.focusBgmVolume
			: defaultPluginSetting.focusBgmVolume,
	};
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const parsePositiveIntegerOrDefault = (
	value: unknown,
	fallback: number,
): number => {
	const parsed = parsePositiveInteger(value);
	return parsed.ok ? parsed.value : fallback;
};

const parseDurationOrDefault = (value: unknown, fallback: Minutes): Minutes => {
	const parsed = parsePositiveInteger(value);
	return parsed.ok && isMinutes(parsed.value) ? parsed.value : fallback;
};

const isNotificationStyle = (value: unknown): value is NotificationStyle =>
	value === "system" || value === "simple";

const isVolume = (
	value: unknown,
	range: { min: number; max: number },
): value is number =>
	typeof value === "number" &&
	Number.isInteger(value) &&
	value >= range.min &&
	value <= range.max;

export const isFocusTickSoundVolume = (value: unknown): value is number =>
	isVolume(value, focusTickSoundVolumeRange);

export const isFocusBgmVolume = (value: unknown): value is number =>
	isVolume(value, focusBgmVolumeRange);

export const isFocusBgmType = (value: unknown): value is FocusBgmType =>
	focusBgmTypes.some((type) => type === value);
