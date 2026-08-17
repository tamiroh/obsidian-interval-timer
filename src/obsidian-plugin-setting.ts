import * as v from "valibot";
import { durationMinutesSchema, wholeNumberSchema } from "./time";
import { defaultLongBreakAfter } from "./interval-timer";
import { notificationStyles } from "./notification";
import { focusBgmTypes } from "./focus-bgm";
import { ObservableStore } from "./observable-store";

//
// Schemas
//

export const focusTickSoundVolumeRange = { min: 0, max: 100 } as const;

export const focusBgmVolumeRange = { min: 0, max: 100 } as const;

const positiveIntegerSchema = v.pipe(
	wholeNumberSchema,
	v.minValue(1, "Enter a positive whole number."),
);

const volumeSchema = (range: { min: number; max: number }) => {
	const message = `Choose a value from ${range.min} to ${range.max}.`;
	return v.pipe(
		wholeNumberSchema,
		v.minValue(range.min, message),
		v.maxValue(range.max, message),
	);
};

const pluginSettingSchema = v.object({
	focusIntervalDuration: v.optional(durationMinutesSchema, 25),
	shortBreakDuration: v.optional(durationMinutesSchema, 5),
	longBreakDuration: v.optional(durationMinutesSchema, 15),
	longBreakAfter: v.optional(positiveIntegerSchema, defaultLongBreakAfter),
	notificationStyle: v.optional(
		v.picklist(notificationStyles, "Select a valid option."),
		"simple",
	),
	flashOverlayEnabled: v.optional(v.boolean("Select a valid option."), false),
	focusTickSoundVolume: v.optional(
		volumeSchema(focusTickSoundVolumeRange),
		0,
	),
	focusBgmType: v.optional(
		v.picklist(focusBgmTypes, "Select a valid option."),
		"none",
	),
	focusBgmVolume: v.optional(volumeSchema(focusBgmVolumeRange), 50),
});

//
// Settings
//

export type PluginSetting = v.InferOutput<typeof pluginSettingSchema>;

export type PluginSettingUpdateResult = v.SafeParseResult<
	(typeof pluginSettingSchema.entries)[keyof PluginSetting]
>;

export const defaultPluginSetting = v.parse(pluginSettingSchema, {});

const storedSchema = v.fallback(v.record(v.string(), v.unknown()), {});

export const parsePluginSetting = (value: unknown): PluginSetting => {
	const stored = v.parse(storedSchema, value);

	const accepted: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(pluginSettingSchema.entries)) {
		const parsed = v.safeParse(entry, stored[key]);
		if (parsed.success) {
			accepted[key] = parsed.output;
		}
	}
	return v.parse(pluginSettingSchema, accepted);
};

//
// Store
//

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

		const parsed = v.safeParse(
			pluginSettingSchema.entries[patchOrKey],
			value,
		);
		if (parsed.success) {
			super.update({ [patchOrKey]: parsed.output });
		}
		return parsed;
	}
}
