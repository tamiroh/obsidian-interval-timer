//
// Output
//

export type PlayMode = "once" | "loop";

export type PlayOptions = {
	mode: PlayMode;
	gain: number;
	fadeSeconds?: number;
};

export type Playback = {
	setGain: (gain: number, fadeSeconds: number) => void;
	stop: (fadeSeconds: number) => void;
};

export class AudioOutput {
	private audioContext: AudioContext | undefined;

	public play(sound: Sound, options: PlayOptions): Playback | undefined {
		const audioContext = this.resolveContext();
		if (audioContext === undefined) return undefined;

		const startAt = audioContext.currentTime;
		const source = sound.createSource(audioContext, options.mode);
		const gain = audioContext.createGain();
		const fadeSeconds = options.fadeSeconds ?? 0;

		source.connect(gain);
		gain.connect(audioContext.destination);

		gain.gain.setValueAtTime(fadeSeconds > 0 ? 0 : options.gain, startAt);
		if (fadeSeconds > 0) {
			gain.gain.linearRampToValueAtTime(
				options.gain,
				startAt + fadeSeconds,
			);
		}

		source.addEventListener("ended", () => {
			source.disconnect();
			gain.disconnect();
		});
		source.start(startAt);

		return {
			setGain: (value, seconds) => {
				AudioOutput.rampGain(
					gain,
					audioContext.currentTime,
					value,
					seconds,
				);
			},
			stop: (seconds) => {
				const stopAt = audioContext.currentTime;
				AudioOutput.rampGain(gain, stopAt, 0, seconds);
				source.stop(stopAt + seconds);
			},
		};
	}

	public dispose(): void {
		const audioContext = this.audioContext;
		this.audioContext = undefined;
		if (audioContext !== undefined && audioContext.state !== "closed") {
			void audioContext.close().catch(() => {});
		}
	}

	private resolveContext(): AudioContext | undefined {
		this.audioContext ??= AudioOutput.createContext();
		if (this.audioContext === undefined) return undefined;

		if (this.audioContext.state === "suspended") {
			void this.audioContext.resume().catch(() => {});
		}
		return this.audioContext;
	}

	private static createContext(): AudioContext | undefined {
		if (typeof window.AudioContext === "undefined") return undefined;

		try {
			return new window.AudioContext();
		} catch {
			return undefined;
		}
	}

	private static rampGain(
		gain: GainNode,
		startAt: number,
		target: number,
		fadeSeconds: number,
	): void {
		const currentGain = gain.gain.value;

		gain.gain.cancelScheduledValues(startAt);
		if (fadeSeconds <= 0) {
			gain.gain.setValueAtTime(target, startAt);
			return;
		}

		gain.gain.setValueAtTime(currentGain, startAt);
		gain.gain.linearRampToValueAtTime(target, startAt + fadeSeconds);
	}
}

//
// Sounds
//

type CreateSamples = (sampleRate: number) => Float32Array;

export type Sound = {
	createSource: (
		audioContext: AudioContext,
		mode: PlayMode,
	) => AudioScheduledSourceNode;
};

export class GeneratedSound implements Sound {
	private readonly createSamples: CreateSamples;

	private readonly buffers = new WeakMap<AudioContext, AudioBuffer>();

	constructor(createSamples: CreateSamples) {
		this.createSamples = createSamples;
	}

	public createSource(
		audioContext: AudioContext,
		mode: PlayMode,
	): AudioScheduledSourceNode {
		const source = audioContext.createBufferSource();
		source.buffer = this.resolveBuffer(audioContext);
		source.loop = mode === "loop";
		return source;
	}

	private resolveBuffer(audioContext: AudioContext): AudioBuffer {
		const cached = this.buffers.get(audioContext);
		if (cached !== undefined) return cached;

		const samples = this.createSamples(audioContext.sampleRate);
		const buffer = audioContext.createBuffer(
			1,
			samples.length,
			audioContext.sampleRate,
		);
		buffer.getChannelData(0).set(samples);

		this.buffers.set(audioContext, buffer);
		return buffer;
	}
}
