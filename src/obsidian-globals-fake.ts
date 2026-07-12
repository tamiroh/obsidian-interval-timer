export function setupObsidianGlobals(): void {
	window.createEl = ((tag: string) =>
		document.createElement(tag)) as typeof createEl;
	window.createDiv = () => document.createElement("div");
}
