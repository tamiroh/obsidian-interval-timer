import { match } from "ts-pattern";
import * as v from "valibot";
import { isMinutes } from "./time";
import { err, ok, type Result } from "./result";
import { defaultLongBreakAfter } from "./interval-timer";
import { notificationStyles } from "./notification";
import { focusBgmTypes } from "./focus-bgm";
import { ObservableStore } from "./observable-store";

//
// Schemas
//

export const volumeRange = { min: 0, max: 100 } as const;

const integerSchema = v.pipe(
	v.union([v.number(), v.pipe(v.string(), v.toNumber())]),
	v.finite(),
	v.integer(),
);

const positiveIntegerSchema = v.pipe(integerSchema, v.minValue(1));

const durationMinutesSchema = v.pipe(positiveIntegerSchema, v.guard(isMinutes));

const volumeSchema = v.pipe(
	integerSchema,
	v.check((value) => value >= volumeRange.min && value <= volumeRange.max),
);

const pluginSettingSchema = v.object({
	focusIntervalDuration: v.optional(durationMinutesSchema, 25),
	shortBreakDuration: v.optional(durationMinutesSchema, 5),
	longBreakDuration: v.optional(durationMinutesSchema, 15),
	longBreakAfter: v.optional(positiveIntegerSchema, defaultLongBreakAfter),
	notificationStyle: v.optional(v.picklist(notificationStyles), "simple"),
	flashOverlayEnabled: v.optional(v.boolean(), false),
	focusTickSoundVolume: v.optional(volumeSchema, 0),
	focusBgmType: v.optional(v.picklist(focusBgmTypes), "none"),
	focusBgmVolume: v.optional(volumeSchema, 50),
});

//
// Settings
//

export type PluginSetting = v.InferOutput<typeof pluginSettingSchema>;

export type PluginSettingReason =
	| "invalid_number"
	| "non_integer"
	| "non_positive_integer"
	| "out_of_range_minutes"
	| "out_of_range_volume"
	| "invalid_option";

export type PluginSettingUpdateResult = Result<
	PluginSetting[keyof PluginSetting],
	PluginSettingReason
>;

const settingReason = (
	issue: v.InferIssue<
		(typeof pluginSettingSchema.entries)[keyof PluginSetting]
	>,
): PluginSettingReason =>
	match(issue.type)
		.with(
			"union",
			"number",
			"string",
			"to_number",
			"finite",
			() => "invalid_number" as const,
		)
		.with("integer", () => "non_integer" as const)
		.with("min_value", () => "non_positive_integer" as const)
		.with("guard", () => "out_of_range_minutes" as const)
		.with("check", () => "out_of_range_volume" as const)
		.with("picklist", "boolean", () => "invalid_option" as const)
		.exhaustive();

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
			v.unwrap(pluginSettingSchema.entries[patchOrKey]),
			value,
		);
		if (!parsed.success) {
			return err(settingReason(parsed.issues[0]));
		}

		super.update({ [patchOrKey]: parsed.output });
		return ok(parsed.output);
	}
}
