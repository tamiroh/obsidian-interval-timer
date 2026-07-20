export function setupObsidianGlobals(): void {
	window.createEl = <K extends keyof HTMLElementTagNameMap>(
		tag: K,
		o?: DomElementInfo | string,
		callback?: (el: HTMLElementTagNameMap[K]) => void,
	): HTMLElementTagNameMap[K] => {
		const { cls, parent, ...unsupported } =
			typeof o === "string" ? { cls: o } : (o ?? {});
		if (Object.keys(unsupported).length > 0) {
			throw new Error(
				"createEl: only cls and parent are supported by this test fake",
			);
		}

		const el = document.createElement(tag);
		if (cls) {
			el.classList.add(...(Array.isArray(cls) ? cls : [cls]));
		}
		parent?.appendChild(el);
		callback?.(el);
		return el;
	};

	window.createDiv = (
		o?: DomElementInfo | string,
		callback?: (el: HTMLDivElement) => void,
	): HTMLDivElement => window.createEl("div", o, callback);

	window.createSvg = <K extends keyof SVGElementTagNameMap>(
		tag: K,
		o?: SvgElementInfo | string,
		callback?: (el: SVGElementTagNameMap[K]) => void,
	): SVGElementTagNameMap[K] => {
		const { cls, parent, ...unsupported } =
			typeof o === "string" ? { cls: o } : (o ?? {});
		if (Object.keys(unsupported).length > 0) {
			throw new Error(
				"createSvg: only cls and parent are supported by this test fake",
			);
		}

		const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
		if (cls) {
			el.classList.add(...(Array.isArray(cls) ? cls : [cls]));
		}
		parent?.appendChild(el);
		callback?.(el);
		return el;
	};

	Node.prototype.createEl = function <K extends keyof HTMLElementTagNameMap>(
		this: Node,
		tag: K,
		o?: DomElementInfo | string,
		callback?: (el: HTMLElementTagNameMap[K]) => void,
	): HTMLElementTagNameMap[K] {
		const options = typeof o === "string" ? { cls: o } : (o ?? {});
		return window.createEl(tag, { ...options, parent: this }, callback);
	};

	Node.prototype.createDiv = function (
		this: Node,
		o?: DomElementInfo | string,
		callback?: (el: HTMLDivElement) => void,
	): HTMLDivElement {
		return this.createEl("div", o, callback);
	};

	Node.prototype.createSpan = function (
		this: Node,
		o?: DomElementInfo | string,
		callback?: (el: HTMLSpanElement) => void,
	): HTMLSpanElement {
		return this.createEl("span", o, callback);
	};

	Node.prototype.createSvg = function <K extends keyof SVGElementTagNameMap>(
		this: Node,
		tag: K,
		o?: SvgElementInfo | string,
		callback?: (el: SVGElementTagNameMap[K]) => void,
	): SVGElementTagNameMap[K] {
		const options = typeof o === "string" ? { cls: o } : (o ?? {});
		return window.createSvg(tag, { ...options, parent: this }, callback);
	};
}
