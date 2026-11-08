export type Color = { r: number; g: number; b: number };

export class FlashOverlay {
	private overlay: HTMLDivElement | undefined;

	public dispose(): void {
		this.hide();
	}

	public show(color: Color): void {
		if (this.overlay === undefined) {
			this.overlay = createDiv();
			this.overlay.classList.add("interval-timer-flash-overlay");
			this.overlay.addEventListener("click", () => {
				this.hide();
			});
			document.body.appendChild(this.overlay);
		}

		this.overlay.setCssProps({
			"--interval-timer-flash-color": `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`,
		});
	}

	public hide(): void {
		if (this.overlay !== undefined) {
			this.overlay.remove();
			this.overlay = undefined;
		}
	}
}
