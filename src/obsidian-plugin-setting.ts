import { parsePositiveInteger } from "./value-parser";
import { isMinutes, type Minutes } from "./time";
import { defaultLongBreakAfter } from "./interval-timer";
import type { NotificationStyle } from "./obsidian-notifier";

export type PluginSetting = {
	focusIntervalDuration: Minutes;
	shortBreakDuration: Minutes;
	longBreakDuration: Minutes;
	longBreakAfter: number;
	notificationStyle: NotificationStyle;
	flashOverlayEnabled: boolean;
};

export const defaultPluginSetting = {
	focusIntervalDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakAfter: defaultLongBreakAfter,
	notificationStyle: "simple",
	flashOverlayEnabled: false,
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
