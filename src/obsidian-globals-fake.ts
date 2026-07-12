export function setupObsidianGlobals(): void {
	window.createEl = <K extends keyof HTMLElementTagNameMap>(
		tag: K,
	): HTMLElementTagNameMap[K] => document.createElement(tag);

	window.createDiv = (): HTMLDivElement => document.createElement("div");

	Node.prototype.createSpan = function (
		this: Node,
		o?: DomElementInfo | string,
	): HTMLSpanElement {
		const span = document.createElement("span");
		const cls = typeof o === "string" ? o : o?.cls;
		if (cls) {
			span.classList.add(...(Array.isArray(cls) ? cls : [cls]));
		}
		this.appendChild(span);
		return span;
	};
}
