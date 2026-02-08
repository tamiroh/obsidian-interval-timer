export type Color = { r: number; g: number; b: number };

export class FlashOverlay {
	// eslint-disable-next-line no-use-before-define
	private static instance: FlashOverlay | undefined;

	private overlay: HTMLDivElement | undefined;

	private styleElement: HTMLStyleElement | undefined;

	// eslint-disable-next-line no-useless-constructor, no-empty-function, @typescript-eslint/no-empty-function
	private constructor() {}

	public static getInstance(): FlashOverlay {
		if (!FlashOverlay.instance) {
			FlashOverlay.instance = new FlashOverlay();
		}
		return FlashOverlay.instance;
	}

	public static dispose(): void {
		if (FlashOverlay.instance) {
			FlashOverlay.instance.hide();
			if (FlashOverlay.instance.styleElement !== undefined) {
				FlashOverlay.instance.styleElement.remove();
				FlashOverlay.instance.styleElement = undefined;
			}
			FlashOverlay.instance = undefined;
		}
	}

	public show(color: Color): void {
		if (this.overlay !== undefined) {
			this.overlay.style.backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
			return;
		}

		this.overlay = document.createElement("div");
		this.overlay.style.position = "fixed";
		this.overlay.style.top = "0";
		this.overlay.style.left = "0";
		this.overlay.style.width = "100%";
		this.overlay.style.height = "100%";
		this.overlay.style.backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
		this.overlay.style.zIndex = "9999";
		this.overlay.style.cursor = "pointer";
		this.overlay.style.animation = "flash-fade 1s linear infinite";
		this.overlay.addEventListener("click", () => this.hide());

		this.addKeyframesIfNeeded();

		document.body.appendChild(this.overlay);
	}

	private addKeyframesIfNeeded(): void {
		if (this.styleElement !== undefined) return;

		this.styleElement = document.createElement("style");
		this.styleElement.textContent = `
			@keyframes flash-fade {
				0% { opacity: 0.9; }
				100% { opacity: 0.3; }
			}
		`;

		document.head.appendChild(this.styleElement);
	}

	public hide(): void {
		if (this.overlay !== undefined) {
			this.overlay.remove();
			this.overlay = undefined;
		}
	}
}
