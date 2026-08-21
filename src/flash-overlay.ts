export type Color = { r: number; g: number; b: number };

export class FlashOverlay {
	private overlay: HTMLDivElement | undefined;

	private styleElement: HTMLStyleElement | undefined;

	private readonly animationName = `flash-${crypto.randomUUID()}`;

	public dispose(): void {
		this.hide();
		if (this.styleElement !== undefined) {
			this.styleElement.remove();
			this.styleElement = undefined;
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
		this.overlay.addEventListener("click", () => {
			this.hide();
		});

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
				animation: ${this.animationName} 1s linear infinite;
			}
			@keyframes ${this.animationName} {
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
