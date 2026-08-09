const tickDurationSeconds = 0.032;

const secondaryImpactDelaySeconds = 0.006;

export class FocusTickSound {
	private audioContext: AudioContext | undefined;

	private tickBuffer: AudioBuffer | undefined;

	public play(volume: number): void {
		if (volume <= 0) return;

		const audioContext = this.getAudioContext();
		if (audioContext === undefined) return;

		if (audioContext.state === "suspended") {
			void audioContext.resume().catch(() => {});
		}

		const source = audioContext.createBufferSource();
		const gain = audioContext.createGain();
		const startAt = audioContext.currentTime;

		source.buffer = this.getTickBuffer(audioContext);
		gain.gain.setValueAtTime(0.1 * Math.min(volume / 100, 1), startAt);

		source.connect(gain);
		gain.connect(audioContext.destination);
		source.addEventListener("ended", () => {
			source.disconnect();
			gain.disconnect();
		});
		source.start(startAt);
	}

	public dispose(): void {
		const audioContext = this.audioContext;
		this.audioContext = undefined;
		this.tickBuffer = undefined;
		if (audioContext !== undefined && audioContext.state !== "closed") {
			void audioContext.close().catch(() => {});
		}
	}

	private getAudioContext(): AudioContext | undefined {
		if (this.audioContext !== undefined) return this.audioContext;
		if (typeof window.AudioContext === "undefined") return undefined;

		try {
			this.audioContext = new window.AudioContext();
			return this.audioContext;
		} catch {
			return undefined;
		}
	}

	private getTickBuffer(audioContext: AudioContext): AudioBuffer {
		if (this.tickBuffer !== undefined) return this.tickBuffer;

		const frameCount = Math.ceil(
			audioContext.sampleRate * tickDurationSeconds,
		);
		const tickBuffer = audioContext.createBuffer(
			1,
			frameCount,
			audioContext.sampleRate,
		);
		const samples = tickBuffer.getChannelData(0);

		for (let frame = 0; frame < frameCount; frame += 1) {
			const elapsedSeconds = frame / audioContext.sampleRate;
			const noise = Math.random() * 2 - 1;
			const primaryImpact = noise * Math.exp(-elapsedSeconds * 850) * 0.8;
			const woodenBody =
				Math.sin(2 * Math.PI * 720 * elapsedSeconds) *
				Math.exp(-elapsedSeconds * 180) *
				0.32;
			const metalMechanism =
				Math.sin(2 * Math.PI * 2_600 * elapsedSeconds) *
				Math.exp(-elapsedSeconds * 240) *
				0.22;
			const secondaryImpact = this.createSecondaryImpact(
				elapsedSeconds,
				noise,
			);
			const endFade = Math.min(
				1,
				(tickDurationSeconds - elapsedSeconds) / 0.003,
			);

			samples[frame] =
				Math.tanh(
					(primaryImpact +
						woodenBody +
						metalMechanism +
						secondaryImpact) *
						1.2,
				) * endFade;
		}

		this.tickBuffer = tickBuffer;
		return tickBuffer;
	}

	private createSecondaryImpact(
		elapsedSeconds: number,
		noise: number,
	): number {
		if (elapsedSeconds < secondaryImpactDelaySeconds) return 0;

		const impactTime = elapsedSeconds - secondaryImpactDelaySeconds;
		const envelope = Math.exp(-impactTime * 600);
		return (
			envelope *
			(noise * 0.28 + Math.sin(2 * Math.PI * 1_900 * impactTime) * 0.18)
		);
	}
}
