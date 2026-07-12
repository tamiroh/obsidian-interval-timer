export type Color = { r: number; g: number; b: number };

export class FlashOverlay {
	private static instance: FlashOverlay | undefined;

	private overlay: HTMLDivElement | undefined;

	private styleElement: HTMLStyleElement | undefined;

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

		this.addStylesIfNeeded();

		this.overlay = createDiv();
		this.overlay.classList.add("interval-timer-flash-overlay");
		this.overlay.style.backgroundColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
		this.overlay.addEventListener("click", () => this.hide());

		document.body.appendChild(this.overlay);
	}

	private addStylesIfNeeded(): void {
		if (this.styleElement !== undefined) return;

		this.styleElement = createEl("style");
		this.styleElement.textContent = `
			.interval-timer-flash-overlay {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				z-index: 9999;
				cursor: pointer;
				animation: flash-fade 1s linear infinite;
			}
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
