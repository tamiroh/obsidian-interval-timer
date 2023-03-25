import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { SampleSettingTab } from "./sampleSettingTab";
import { SampleModal } from "./sampleModal";
import { Settings } from "./types/Settings";
import { DEFAULT_SETTINGS } from "./constants";

export default class MyPlugin extends Plugin {
	settings: Settings;

	override async onload() {
		await this.loadSettings();
		this.addRibbonIcon("dice", "Sample Plugin", () => {
			new Notice("This is a notice!");
		});
		this.addStatusBarItem().setText("Status Bar Text");
		this.addCommands();
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	addCommands() {
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => new SampleModal(this.app).open(),
		});
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor) => {
				new Notice(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean): boolean | void => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});
	}

	async loadSettings() {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
