import { parsePositiveInteger } from "./value-parser";
import { isMinutes, type Minutes } from "./time";
import {
	defaultLongBreakAfter,
	intervalCompletionBehaviors,
	type IntervalCompletionBehavior,
} from "./interval-timer";
import type { NotificationStyle } from "./notification";
import { focusBgmTypes, type FocusBgmType } from "./focus-bgm";

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
