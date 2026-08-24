import { match } from "ts-pattern";
import * as v from "valibot";
import {
	defaultLongBreakAfter,
	intervalCompletionBehaviors,
} from "./interval-timer";
import { focusBgmTypes } from "./focus-bgm";
import { notificationStyles } from "./notification";
import { ObservableStore } from "./observable-store";
import { err, ok, type Result } from "./result";
import { isMinutes } from "./time";

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
	intervalCompletionBehavior: v.optional(
		v.picklist(intervalCompletionBehaviors),
		"advanceToNextInterval",
	),
	focusBgmType: v.optional(v.picklist(focusBgmTypes), "none"),
	focusBgmVolume: v.optional(volumeSchema, 50),
});

const pluginSettingPatchSchema = v.strictObject({
	focusIntervalDuration: v.exactOptional(durationMinutesSchema),
	shortBreakDuration: v.exactOptional(durationMinutesSchema),
	longBreakDuration: v.exactOptional(durationMinutesSchema),
	longBreakAfter: v.exactOptional(positiveIntegerSchema),
	notificationStyle: v.exactOptional(v.picklist(notificationStyles)),
	flashOverlayEnabled: v.exactOptional(v.boolean()),
	focusTickSoundVolume: v.exactOptional(volumeSchema),
	intervalCompletionBehavior: v.exactOptional(
		v.picklist(intervalCompletionBehaviors),
	),
	focusBgmType: v.exactOptional(v.picklist(focusBgmTypes)),
	focusBgmVolume: v.exactOptional(volumeSchema),
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
	| "invalid_option"
	| "unknown_setting";

export type PluginSettingUpdateResult<T = PluginSetting[keyof PluginSetting]> =
	Result<T, PluginSettingReason>;

const settingReason = (
	issue:
		| v.InferIssue<
				(typeof pluginSettingSchema.entries)[keyof PluginSetting]
		  >
		| v.InferIssue<typeof pluginSettingPatchSchema>,
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
		.with("strict_object", () => "unknown_setting" as const)
		.exhaustive();

export const defaultPluginSetting = v.parse(pluginSettingSchema, {});

const storedSchema = v.fallback(v.record(v.string(), v.unknown()), {});

//
// Store
//

export class PluginSettingStore extends ObservableStore<PluginSetting> {
	public override update(
		patch: Partial<PluginSetting>,
	): PluginSettingUpdateResult<Partial<PluginSetting>> {
		return match(v.safeParse(pluginSettingPatchSchema, patch))
			.with({ success: false }, ({ issues }) =>
				err(settingReason(issues[0])),
			)
			.with({ success: true }, ({ output }) => {
				super.update(output);
				return ok(output);
			})
			.exhaustive();
	}

	public updateFromUnknown(
		key: keyof PluginSetting,
		value: unknown,
	): PluginSettingUpdateResult {
		return match(
			v.safeParse(v.unwrap(pluginSettingSchema.entries[key]), value),
		)
			.with({ success: false }, ({ issues }) =>
				err(settingReason(issues[0])),
			)
			.with({ success: true }, ({ output }) => {
				super.update({ [key]: output });
				return ok(output);
			})
			.exhaustive();
	}

	public loadFromUnknown(value: unknown): void {
		const stored = v.parse(storedSchema, value);
		const accepted: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(pluginSettingSchema.entries)) {
			const parsed = v.safeParse(entry, stored[key]);
			if (parsed.success) {
				accepted[key] = parsed.output;
			}
		}
		super.update(v.parse(pluginSettingSchema, accepted));
	}
}
