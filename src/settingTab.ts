import { App, PluginSettingTab, Setting } from "obsidian";
import Plugin from "./main";

export type PluginSetting = {
	focusIntervalDuration: number;
	shortBreakDuration: number;
	longBreakDuration: number;
	longBreakAfter: number;
};

export const DEFAULT_SETTINGS: PluginSetting = {
	focusIntervalDuration: 25,
	shortBreakDuration: 5,
	longBreakDuration: 15,
	longBreakAfter: 4,
};

export class SettingTab extends PluginSettingTab {
	plugin: Plugin;

	constructor(app: App, plugin: Plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h1", { text: "Durations" });

		new Setting(containerEl)
			.setName("Focus interval duration (minutes)")
			.addText((text) =>
				text
					.setPlaceholder("Example: 25")
					.setValue(
						String(this.plugin.settings.focusIntervalDuration),
					)
					.onChange(async (value) => {
						this.plugin.settings.focusIntervalDuration =
							Number(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Short break duration (minutes)")
			.addText((text) =>
				text
					.setPlaceholder("Example: 5")
					.setValue(String(this.plugin.settings.shortBreakDuration))
					.onChange(async (value) => {
						this.plugin.settings.shortBreakDuration = Number(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Long break duration (minutes)")
			.addText((text) =>
				text
					.setPlaceholder("Example: 15")
					.setValue(String(this.plugin.settings.longBreakDuration))
					.onChange(async (value) => {
						this.plugin.settings.longBreakDuration = Number(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Start long break after (intervals)")
			.addText((text) =>
				text
					.setPlaceholder("Example: 4")
					.setValue(String(this.plugin.settings.longBreakAfter))
					.onChange(async (value) => {
						this.plugin.settings.longBreakAfter = Number(value);
						await this.plugin.saveSettings();
					}),
			);
	}
}
