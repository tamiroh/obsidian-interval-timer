import { parsePositiveInteger } from "./value-parser";
import type { NotificationStyle } from "./notifier";

export type PluginSetting = {
	focusIntervalDuration: number;
	shortBreakDuration: number;
	longBreakDuration: number;
	longBreakAfter: number;
	notificationStyle: NotificationStyle;
};

export const defaultPluginSetting = {
	focusIntervalDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakAfter: 4,
	notificationStyle: "simple",
} satisfies PluginSetting;

export const parsePluginSetting = (value: unknown): PluginSetting => {
	const stored = isRecord(value) ? value : {};

	return {
		focusIntervalDuration: parsePositiveIntegerOrDefault(
			stored.focusIntervalDuration,
			defaultPluginSetting.focusIntervalDuration,
		),
		shortBreakDuration: parsePositiveIntegerOrDefault(
			stored.shortBreakDuration,
			defaultPluginSetting.shortBreakDuration,
		),
		longBreakDuration: parsePositiveIntegerOrDefault(
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

const isNotificationStyle = (value: unknown): value is NotificationStyle =>
	value === "system" || value === "simple";
