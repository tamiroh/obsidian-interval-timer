import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { App, PluginManifest } from "obsidian";
import { Notice } from "./obsidian-fake";
import Plugin from "./plugin";
import { defaultPluginSetting } from "./plugin-setting";

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
});

const createPlugin = (): Plugin => {
	const app = {
		workspace: { updateOptions: () => {} },
	} as unknown as App;
	const manifest = { id: "interval-timer-test" } as unknown as PluginManifest;
	return new Plugin(app, manifest);
};
