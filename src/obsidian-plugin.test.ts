import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { App, PluginManifest } from "obsidian";
import { Notice } from "./obsidian-fake";
import { Plugin } from "./obsidian-plugin";

describe("Plugin", () => {
	beforeEach(() => {
		window.localStorage.clear();
		Notice.messages = [];
	});

	afterEach(() => {
		window.localStorage.clear();
	});

	it("loads and unloads with default settings", async () => {
		const plugin = createPlugin();

		await plugin.onload();
		plugin.onunload();

		expect(Notice.messages).toEqual([]);
	});

	it("updates the interval completion behavior", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const result = plugin.updateSetting(
			"intervalCompletionBehavior",
			"countDownPastZero",
		);

		expect(result).toEqual({ ok: true, value: "countDownPastZero" });
		expect(plugin.currentSettings.intervalCompletionBehavior).toBe(
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
