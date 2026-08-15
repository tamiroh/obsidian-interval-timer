import { App, displayTooltip, PluginSettingTab, Setting } from "obsidian";
import type Plugin from "./obsidian-plugin";
import type { PluginSetting } from "./obsidian-plugin";
import {
	focusBgmVolumeRange,
	focusTickSoundVolumeRange,
} from "./obsidian-plugin-setting";
import { focusBgmTypes, type FocusBgmType } from "./focus-bgm";
import { minutesUpperBound } from "./time";

const VALIDATION_TOOLTIP_CLASS = "interval-timer-validation-tooltip";

const focusBgmTypeLabels: Record<FocusBgmType, string> = {
	none: "None",
	whiteNoise: "White noise",
};

export class SettingTab extends PluginSettingTab {
	private plugin: Plugin;

	constructor(app: App, plugin: Plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	public override display(): void {
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

		new Setting(containerEl)
			.setName("Flash overlay")
			.setDesc("Flash the screen with a color when an interval ends.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.flashOverlayEnabled)
					.onChange(async (value) => {
						await this.updateSettingOrShowValidationError(
							"flashOverlayEnabled",
							value,
							toggle.toggleEl,
							"Flash overlay",
						);
					});
			});

		new Setting(containerEl).setHeading().setName("Sound");

		new Setting(containerEl)
			.setName("Clock tick volume")
			.setDesc("Volume during focus intervals (0–100). Set to 0 to mute.")
			.addSlider((slider) => {
				slider
					.setLimits(
						focusTickSoundVolumeRange.min,
						focusTickSoundVolumeRange.max,
						5,
					)
					.setValue(this.plugin.settings.focusTickSoundVolume);
				slider.onChange(async (value) => {
					await this.updateSettingOrShowValidationError(
						"focusTickSoundVolume",
						value,
						slider.sliderEl,
						"Clock tick volume",
					);
				});
			});

		new Setting(containerEl)
			.setName("Background sound")
			.setDesc("Sound played continuously during focus intervals.")
			.addDropdown((dropdown) => {
				focusBgmTypes.forEach((type) => {
					dropdown.addOption(type, focusBgmTypeLabels[type]);
				});
				dropdown
					.setValue(this.plugin.settings.focusBgmType)
					.onChange(async (value) => {
						await this.updateSettingOrShowValidationError(
							"focusBgmType",
							value,
							dropdown.selectEl,
							"Background sound",
						);
					});
			});

		new Setting(containerEl)
			.setName("Background sound volume")
			.setDesc(
				"Volume of the background sound (0–100). Set to 0 to mute.",
			)
			.addSlider((slider) => {
				slider
					.setLimits(
						focusBgmVolumeRange.min,
						focusBgmVolumeRange.max,
						5,
					)
					.setValue(this.plugin.settings.focusBgmVolume);
				slider.onChange(async (value) => {
					await this.updateSettingOrShowValidationError(
						"focusBgmVolume",
						value,
						slider.sliderEl,
						"Background sound volume",
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
			case "out_of_range_minutes":
				return `${settingLabel}: please enter fewer than ${minutesUpperBound} minutes.`;
			case "invalid_notification_style":
				return `${settingLabel}: invalid option selected.`;
			case "invalid_boolean":
				return `${settingLabel}: invalid option selected.`;
			case "invalid_focus_tick_sound_volume":
			case "invalid_focus_bgm_volume":
				return `${settingLabel}: please choose a value from 0 to 100.`;
			case "invalid_focus_bgm_type":
				return `${settingLabel}: invalid option selected.`;
		}
	}
}
