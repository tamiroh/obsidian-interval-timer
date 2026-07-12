import type {
	App,
	Modal as RealModal,
	Notice as RealNotice,
	setTooltip as RealSetTooltip,
} from "obsidian";

export class TFile {}

export class Notice {
	static messages: string[] = [];

	constructor(message: ConstructorParameters<typeof RealNotice>[0]) {
		Notice.messages.push(
			typeof message === "string" ? message : (message.textContent ?? ""),
		);
	}
}

export class Modal implements Pick<
	RealModal,
	"app" | "contentEl" | "open" | "close" | "onOpen" | "onClose"
> {
	public app: App;

	public contentEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement("div");
	}

	public open(): void {
		this.onOpen();
	}

	public close(): void {
		this.onClose();
	}

	public onOpen(): void {}

	public onClose(): void {}
}

export const setTooltip: typeof RealSetTooltip = (el, tooltip) => {
	el.setAttribute("aria-label", typeof tooltip === "string" ? tooltip : "");
};

export class MenuItem {
	public title: string | undefined;

	private clickHandler: (() => void) | undefined;

	public setTitle(title: string): this {
		this.title = title;
		return this;
	}

	public onClick(handler: () => void): this {
		this.clickHandler = handler;
		return this;
	}

	public trigger(): void {
		this.clickHandler?.();
	}
}

export class Menu {
	static instances: Menu[] = [];

	public items: MenuItem[] = [];

	constructor() {
		Menu.instances.push(this);
	}

	public addItem(callback: (item: MenuItem) => void): this {
		const item = new MenuItem();
		callback(item);
		this.items.push(item);
		return this;
	}

	public showAtMouseEvent(_event: MouseEvent): this {
		return this;
	}
}
