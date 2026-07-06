globalThis.createEl = ((tag: string) =>
	document.createElement(tag)) as typeof createEl;
globalThis.createDiv = (() =>
	document.createElement("div")) as typeof createDiv;
