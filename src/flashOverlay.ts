export type Color = { r: number; g: number; b: number };

export class FlashOverlay {
	private overlay: HTMLDivElement | undefined;

	private styleElement: HTMLStyleElement | undefined;

	public show = (color: Color) => {
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
		this.overlay.addEventListener("click", this.hide);

		this.addKeyframesIfNeeded();

		document.body.appendChild(this.overlay);
	};

	private addKeyframesIfNeeded = () => {
		if (this.styleElement !== undefined) return;

		this.styleElement = document.createElement("style");
		this.styleElement.textContent = `
			@keyframes flash-fade {
				0% { opacity: 0.9; }
				100% { opacity: 0.3; }
			}
		`;

		document.head.appendChild(this.styleElement);
	};

	public hide = () => {
		if (this.overlay !== undefined) {
			this.overlay.removeEventListener("click", this.hide);
			this.overlay.remove();
			this.overlay = undefined;
		}
	};

	public dispose = () => {
		this.hide();
		if (this.styleElement !== undefined) {
			this.styleElement.remove();
			this.styleElement = undefined;
		}
	};
}
