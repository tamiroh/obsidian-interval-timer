export function setupObsidianGlobals(): void {
	window.createEl = <K extends keyof HTMLElementTagNameMap>(
		tag: K,
		o?: DomElementInfo | string,
		callback?: (el: HTMLElementTagNameMap[K]) => void,
	): HTMLElementTagNameMap[K] => {
		if (o !== undefined || callback !== undefined) {
			throw new Error(
				"createEl: options and callback are not supported by this test fake",
			);
		}
		return document.createElement(tag);
	};

	window.createDiv = (
		o?: DomElementInfo | string,
		callback?: (el: HTMLDivElement) => void,
	): HTMLDivElement => window.createEl("div", o, callback);

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
