export type ObsidianTestWindow = Window & {
	Node: typeof Node;
	createDiv: typeof createDiv;
	createEl: typeof createEl;
	createSvg: typeof createSvg;
};

export function setupObsidianGlobals(
	targetWindow: ObsidianTestWindow = window,
): void {
	targetWindow.createEl = <K extends keyof HTMLElementTagNameMap>(
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

		const el = targetWindow.document.createElement(tag);
		if (cls != null) {
			el.classList.add(...(Array.isArray(cls) ? cls : [cls]));
		}
		parent?.appendChild(el);
		callback?.(el);
		return el;
	};

	targetWindow.createDiv = (
		o?: DomElementInfo | string,
		callback?: (el: HTMLDivElement) => void,
	): HTMLDivElement => targetWindow.createEl("div", o, callback);

	targetWindow.createSvg = <K extends keyof SVGElementTagNameMap>(
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

		const el = targetWindow.document.createElementNS(
			"http://www.w3.org/2000/svg",
			tag,
		);
		if (cls != null) {
			el.classList.add(...(Array.isArray(cls) ? cls : [cls]));
		}
		parent?.appendChild(el);
		callback?.(el);
		return el;
	};

	targetWindow.Node.prototype.createEl = function <
		K extends keyof HTMLElementTagNameMap,
	>(
		this: Node,
		tag: K,
		o?: DomElementInfo | string,
		callback?: (el: HTMLElementTagNameMap[K]) => void,
	): HTMLElementTagNameMap[K] {
		const options = typeof o === "string" ? { cls: o } : (o ?? {});
		return targetWindow.createEl(
			tag,
			{ ...options, parent: this },
			callback,
		);
	};

	targetWindow.Node.prototype.createDiv = function (
		this: Node,
		o?: DomElementInfo | string,
		callback?: (el: HTMLDivElement) => void,
	): HTMLDivElement {
		return this.createEl("div", o, callback);
	};

	targetWindow.Node.prototype.createSpan = function (
		this: Node,
		o?: DomElementInfo | string,
		callback?: (el: HTMLSpanElement) => void,
	): HTMLSpanElement {
		return this.createEl("span", o, callback);
	};

	targetWindow.Node.prototype.createSvg = function <
		K extends keyof SVGElementTagNameMap,
	>(
		this: Node,
		tag: K,
		o?: SvgElementInfo | string,
		callback?: (el: SVGElementTagNameMap[K]) => void,
	): SVGElementTagNameMap[K] {
		const options = typeof o === "string" ? { cls: o } : (o ?? {});
		return targetWindow.createSvg(
			tag,
			{ ...options, parent: this },
			callback,
		);
	};
}
