import { App, displayTooltip, PluginSettingTab, Setting } from "obsidian";
import { match } from "ts-pattern";
import type { Plugin, PluginSetting } from "./obsidian-plugin";
import {
	type PluginSettingReason,
	volumeRange,
} from "./obsidian-plugin-setting";
import { focusBgmTypes, type FocusBgmType } from "./focus-bgm";
import { minutesUpperBound } from "./time";

const VALIDATION_TOOLTIP_CLASS =
	"interval-timer-setting-tab-validation-tooltip";

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
						String(
							this.plugin.currentSettings.focusIntervalDuration,
						),
					)
					.onChange((value) => {
						this.updateSettingOrShowValidationError(
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
					.setValue(
						String(this.plugin.currentSettings.shortBreakDuration),
					)
					.onChange((value) => {
						this.updateSettingOrShowValidationError(
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
					.setValue(
						String(this.plugin.currentSettings.longBreakDuration),
					)
					.onChange((value) => {
						this.updateSettingOrShowValidationError(
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
					.setValue(
						String(this.plugin.currentSettings.longBreakAfter),
					)
					.onChange((value) => {
						this.updateSettingOrShowValidationError(
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
				.setValue(this.plugin.currentSettings.notificationStyle)
				.onChange((value) => {
					this.updateSettingOrShowValidationError(
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
					.setValue(this.plugin.currentSettings.flashOverlayEnabled)
					.onChange((value) => {
						this.updateSettingOrShowValidationError(
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
					.setLimits(volumeRange.min, volumeRange.max, 5)
					.setValue(this.plugin.currentSettings.focusTickSoundVolume);
				slider.onChange((value) => {
					this.updateSettingOrShowValidationError(
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
					.setValue(this.plugin.currentSettings.focusBgmType)
					.onChange((value) => {
						this.updateSettingOrShowValidationError(
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
					.setLimits(volumeRange.min, volumeRange.max, 5)
					.setValue(this.plugin.currentSettings.focusBgmVolume);
				slider.onChange((value) => {
					this.updateSettingOrShowValidationError(
						"focusBgmVolume",
						value,
						slider.sliderEl,
						"Background sound volume",
					);
				});
			});
	}

	private updateSettingOrShowValidationError(
		key: keyof PluginSetting,
		value: unknown,
		targetEl: HTMLElement,
		settingLabel: string,
	): void {
		const result = this.plugin.updateSetting(key, value);
		if (result.ok) {
			this.clearValidationTooltips();
			return;
		}

		displayTooltip(
			targetEl,
			`${settingLabel}: ${validationMessage(result.reason)}`,
			{
				placement: "left",
				classes: ["mod-error", VALIDATION_TOOLTIP_CLASS],
			},
		);
	}

	private clearValidationTooltips(): void {
		document
			.querySelectorAll(`.${VALIDATION_TOOLTIP_CLASS}`)
			.forEach((tooltipEl) => {
				tooltipEl.remove();
			});
	}
}

const validationMessage = (reason: PluginSettingReason): string =>
	match(reason)
		.with("invalid_number", () => "Enter a number.")
		.with("non_integer", () => "Enter a whole number.")
		.with("non_positive_integer", () => "Enter a positive whole number.")
		.with(
			"out_of_range_minutes",
			() => `Enter fewer than ${minutesUpperBound} minutes.`,
		)
		.with(
			"out_of_range_volume",
			() =>
				`Choose a value from ${volumeRange.min} to ${volumeRange.max}.`,
		)
		.with("invalid_option", () => "Select a valid option.")
		.exhaustive();
