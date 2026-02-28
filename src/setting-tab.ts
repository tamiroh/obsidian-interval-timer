import { App, displayTooltip, PluginSettingTab, Setting } from "obsidian";
import Plugin, { PluginSetting } from "./plugin";

const VALIDATION_TOOLTIP_CLASS = "interval-timer-validation-tooltip";

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
						await this.updateSettingOrShowValidationError(
							"focusIntervalDuration",
							value,
							text.inputEl,
							"Focus interval duration",
						);
					}),
			);

		new Setting(containerEl)
			.setName("Short break duration (minutes)")
			.addText((text) =>
				text
					.setPlaceholder("Example: 5")
					.setValue(String(this.plugin.settings.shortBreakDuration))
					.onChange(async (value) => {
						await this.updateSettingOrShowValidationError(
							"shortBreakDuration",
							value,
							text.inputEl,
							"Short break duration",
						);
					}),
			);

		new Setting(containerEl)
			.setName("Long break duration (minutes)")
			.addText((text) =>
				text
					.setPlaceholder("Example: 15")
					.setValue(String(this.plugin.settings.longBreakDuration))
					.onChange(async (value) => {
						await this.updateSettingOrShowValidationError(
							"longBreakDuration",
							value,
							text.inputEl,
							"Long break duration",
						);
					}),
			);

		new Setting(containerEl)
			.setName("Start long break after (intervals)")
			.addText((text) =>
				text
					.setPlaceholder("Example: 4")
					.setValue(String(this.plugin.settings.longBreakAfter))
					.onChange(async (value) => {
						await this.updateSettingOrShowValidationError(
							"longBreakAfter",
							value,
							text.inputEl,
							"Start long break after",
						);
					}),
			);

		new Setting(containerEl).setHeading().setName("Notification");

		new Setting(containerEl).setName("Style").addDropdown((dropdown) => {
			dropdown
				.addOption("system", "System")
				.addOption("simple", "Simple")
				.setValue(this.plugin.settings.notificationStyle)
				.onChange(async (value) => {
					await this.updateSettingOrShowValidationError(
						"notificationStyle",
						value,
						dropdown.selectEl,
						"Notification style",
					);
				});
		});
	}

	private async updateSettingOrShowValidationError(
		key: keyof PluginSetting,
		value: unknown,
		targetEl: HTMLElement,
		settingLabel: string,
	): Promise<void> {
		const result = await this.plugin.updateSetting(key, value);
		if (result.ok) {
			this.clearValidationTooltips();
			return;
		}

		displayTooltip(
			targetEl,
			this.formatParseErrorMessage(settingLabel, result.reason),
			{
				placement: "left",
				classes: ["mod-error", VALIDATION_TOOLTIP_CLASS],
			},
		);
	}

	private clearValidationTooltips(): void {
		document
			.querySelectorAll(`.${VALIDATION_TOOLTIP_CLASS}`)
			.forEach((tooltipEl) => tooltipEl.remove());
	}

	private formatParseErrorMessage(
		settingLabel: string,
		reason: Extract<
			Awaited<ReturnType<Plugin["updateSetting"]>>,
			{ ok: false }
		>["reason"],
	): string {
		switch (reason) {
			case "invalid_number":
				return `${settingLabel}: please enter a number.`;
			case "non_positive_integer":
				return `${settingLabel}: please enter a positive integer.`;
			case "invalid_notification_style":
				return `${settingLabel}: invalid option selected.`;
		}
	}
}
