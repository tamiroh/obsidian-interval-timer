import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { App, PluginManifest } from "obsidian";
import { Notice } from "./obsidian-fake";
import Plugin from "./obsidian-plugin";
import { defaultPluginSetting } from "./obsidian-plugin-setting";

describe("Plugin", () => {
	beforeEach(() => {
		window.localStorage.clear();
		Notice.messages = [];
	});

	afterEach(() => {
		window.localStorage.clear();
	});

	it("loads default settings on load when nothing is stored yet", async () => {
		const plugin = createPlugin();

		await plugin.onload();

		expect(plugin.settings).toEqual(defaultPluginSetting);
	});

	it("updates a valid duration setting", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const result = await plugin.updateSetting(
			"focusIntervalDuration",
			"30",
		);

		expect(result).toEqual({ ok: true, value: 30 });
		expect(plugin.settings.focusIntervalDuration).toBe(30);
	});

	it("rejects a non-positive-integer duration setting", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const result = await plugin.updateSetting(
			"focusIntervalDuration",
			"not-a-number",
		);

		expect(result).toEqual({ ok: false, reason: "invalid_number" });
		expect(plugin.settings.focusIntervalDuration).toBe(
			defaultPluginSetting.focusIntervalDuration,
		);
	});

	it("rejects an invalid notification style", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const result = await plugin.updateSetting(
			"notificationStyle",
			"unsupported",
		);

		expect(result).toEqual({
			ok: false,
			reason: "invalid_notification_style",
		});
	});

	it("updates the flash overlay setting", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const result = await plugin.updateSetting("flashOverlayEnabled", true);

		expect(result).toEqual({ ok: true, value: true });
		expect(plugin.settings.flashOverlayEnabled).toBe(true);
	});

	it("rejects a non-boolean flash overlay setting", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const result = await plugin.updateSetting("flashOverlayEnabled", "yes");

		expect(result).toEqual({ ok: false, reason: "invalid_boolean" });
		expect(plugin.settings.flashOverlayEnabled).toBe(
			defaultPluginSetting.flashOverlayEnabled,
		);
	});

	it("updates the focus tick sound volume", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const result = await plugin.updateSetting("focusTickSoundVolume", 65);

		expect(result).toEqual({ ok: true, value: 65 });
		expect(plugin.settings.focusTickSoundVolume).toBe(65);
	});

	it("rejects an out-of-range focus tick sound volume", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const result = await plugin.updateSetting("focusTickSoundVolume", 101);

		expect(result).toEqual({
			ok: false,
			reason: "invalid_focus_tick_sound_volume",
		});
		expect(plugin.settings.focusTickSoundVolume).toBe(
			defaultPluginSetting.focusTickSoundVolume,
		);
	});

	it("updates the interval completion behavior", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const result = await plugin.updateSetting(
			"intervalCompletionBehavior",
			"countDownPastZero",
		);

		expect(result).toEqual({ ok: true, value: "countDownPastZero" });
		expect(plugin.settings.intervalCompletionBehavior).toBe(
			"countDownPastZero",
		);
	});
});

const createPlugin = (): Plugin => {
	const app = {
		workspace: { updateOptions: () => {} },
	} as unknown as App;
	const manifest = { id: "interval-timer-test" } as unknown as PluginManifest;
	return new Plugin(app, manifest);
};
