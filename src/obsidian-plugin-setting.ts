import {
	parsePositiveInteger,
	type ParsePositiveIntegerResult,
} from "./value-parser";
import { isMinutes, type Minutes } from "./time";
import {
	defaultLongBreakAfter,
	intervalCompletionBehaviors,
	type IntervalCompletionBehavior,
} from "./interval-timer";
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
	intervalCompletionBehavior: IntervalCompletionBehavior;
	focusBgmType: FocusBgmType;
	focusBgmVolume: number;
};

export type ParseNotificationStyleResult = Result<
	NotificationStyle,
	"invalid_notification_style"
>;

export type ParseBooleanResult = Result<boolean, "invalid_boolean">;

export type ParseFocusTickSoundVolumeResult = Result<
	number,
	"invalid_focus_tick_sound_volume"
>;

export type ParseIntervalCompletionBehaviorResult = Result<
	IntervalCompletionBehavior,
	"invalid_interval_completion_behavior"
>;

export type ParseFocusBgmTypeResult = Result<
	FocusBgmType,
	"invalid_focus_bgm_type"
>;

export type ParseFocusBgmVolumeResult = Result<
	number,
	"invalid_focus_bgm_volume"
>;

export type ParseDurationResult = Result<
	Minutes,
	"invalid_number" | "non_positive_integer" | "out_of_range_minutes"
>;

export type PluginSettingUpdateResult =
	| ParseDurationResult
	| ParsePositiveIntegerResult
	| ParseNotificationStyleResult
	| ParseBooleanResult
	| ParseFocusTickSoundVolumeResult
	| ParseIntervalCompletionBehaviorResult
	| ParseFocusBgmTypeResult
	| ParseFocusBgmVolumeResult;

export const parseDuration = (value: unknown): ParseDurationResult => {
	const parsed = parsePositiveInteger(value);
	if (!parsed.ok) return parsed;
	if (!isMinutes(parsed.value)) {
		return err("out_of_range_minutes");
	}
	return ok(parsed.value);
};

export const parseNotificationStyleValue = (
	value: unknown,
): ParseNotificationStyleResult =>
	isNotificationStyle(value) ? ok(value) : err("invalid_notification_style");

export const parseFlashOverlayEnabled = (value: unknown): ParseBooleanResult =>
	typeof value === "boolean" ? ok(value) : err("invalid_boolean");

export const parseFocusTickSoundVolumeValue = (
	value: unknown,
): ParseFocusTickSoundVolumeResult =>
	isFocusTickSoundVolume(value)
		? ok(value)
		: err("invalid_focus_tick_sound_volume");

export const parseIntervalCompletionBehaviorValue = (
	value: unknown,
): ParseIntervalCompletionBehaviorResult =>
	isIntervalCompletionBehavior(value)
		? ok(value)
		: err("invalid_interval_completion_behavior");

export const parseFocusBgmTypeValue = (
	value: unknown,
): ParseFocusBgmTypeResult =>
	isFocusBgmType(value) ? ok(value) : err("invalid_focus_bgm_type");

export const parseFocusBgmVolumeValue = (
	value: unknown,
): ParseFocusBgmVolumeResult =>
	isFocusBgmVolume(value) ? ok(value) : err("invalid_focus_bgm_volume");

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
				const parsed = parseDuration(value);
				if (!parsed.ok) return parsed;

				super.update({ [key]: parsed.value });

				return parsed;
			}
			case "longBreakAfter": {
				const parsed = parsePositiveInteger(value);
				if (!parsed.ok) return parsed;

				super.update({ longBreakAfter: parsed.value });

				return parsed;
			}
			case "notificationStyle": {
				const parsed = parseNotificationStyleValue(value);
				if (!parsed.ok) return parsed;

				super.update({ notificationStyle: parsed.value });

				return parsed;
			}
			case "flashOverlayEnabled": {
				const parsed = parseFlashOverlayEnabled(value);
				if (!parsed.ok) return parsed;

				super.update({ flashOverlayEnabled: parsed.value });

				return parsed;
			}
			case "focusTickSoundVolume": {
				const parsed = parseFocusTickSoundVolumeValue(value);
				if (!parsed.ok) return parsed;

				super.update({ focusTickSoundVolume: parsed.value });

				return parsed;
			}
			case "intervalCompletionBehavior": {
				const parsed = parseIntervalCompletionBehaviorValue(value);
				if (!parsed.ok) return parsed;

				super.update({ intervalCompletionBehavior: parsed.value });

				return parsed;
			}
			case "focusBgmType": {
				const parsed = parseFocusBgmTypeValue(value);
				if (!parsed.ok) return parsed;

				super.update({ focusBgmType: parsed.value });

				return parsed;
			}
			case "focusBgmVolume": {
				const parsed = parseFocusBgmVolumeValue(value);
				if (!parsed.ok) return parsed;

				super.update({ focusBgmVolume: parsed.value });

				return parsed;
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
	intervalCompletionBehavior: "advanceToNextInterval",
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
		focusTickSoundVolume: parseFocusTickSoundVolume(stored),
		intervalCompletionBehavior: isIntervalCompletionBehavior(
			stored.intervalCompletionBehavior,
		)
			? stored.intervalCompletionBehavior
			: defaultPluginSetting.intervalCompletionBehavior,
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

export const isIntervalCompletionBehavior = (
	value: unknown,
): value is IntervalCompletionBehavior =>
	intervalCompletionBehaviors.some((behavior) => behavior === value);

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

const parseFocusTickSoundVolume = (stored: Record<string, unknown>): number => {
	if (isFocusTickSoundVolume(stored.focusTickSoundVolume)) {
		return stored.focusTickSoundVolume;
	}
	return defaultPluginSetting.focusTickSoundVolume;
};
