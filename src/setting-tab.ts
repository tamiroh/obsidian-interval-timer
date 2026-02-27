import { App, PluginSettingTab, Setting } from "obsidian";
import Plugin from "./plugin";
import { NotificationStyle } from "./notifier";

export class SettingTab extends PluginSettingTab {
	private plugin: Plugin;

	constructor(app: App, plugin: Plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	public display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setHeading().setName("Duration");

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

		new Setting(containerEl).setHeading().setName("Notification");

		new Setting(containerEl).setName("Style").addDropdown((dropdown) => {
			dropdown
				.addOption("system", "System")
				.addOption("simple", "Simple")
				.setValue(this.plugin.settings.notificationStyle)
				.onChange(async (value) => {
					this.plugin.settings.notificationStyle =
						value as NotificationStyle;
					await this.plugin.saveSettings();
				});
		});
	}
}
