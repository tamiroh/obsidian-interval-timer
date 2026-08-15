import { match } from "ts-pattern";

type CreateSamples = (sampleRate: number) => Float32Array;

export type GeneratedSound = {
	type: "generated";
	createSamples: CreateSamples;
};

export type Sound = GeneratedSound;

export type PlayOptions = {
	mode: "once" | "loop";
	gain: number;
	fadeSeconds?: number;
};

export type Playback = {
	setGain: (gain: number, fadeSeconds: number) => void;
	stop: (fadeSeconds: number) => void;
};

export class AudioOutput {
	private audioContext: AudioContext | undefined;

	private buffers = new WeakMap<CreateSamples, AudioBuffer>();

	public play(sound: Sound, options: PlayOptions): Playback | undefined {
		const audioContext = this.resolveContext();
		if (audioContext === undefined) return undefined;

		const startAt = audioContext.currentTime;
		const source = audioContext.createBufferSource();
		const gain = audioContext.createGain();
		const fadeSeconds = options.fadeSeconds ?? 0;

		source.buffer = this.resolveBuffer(audioContext, sound);
		source.loop = options.mode === "loop";
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
				rampGain(gain, audioContext.currentTime, value, seconds);
			},
			stop: (seconds) => {
				const stopAt = audioContext.currentTime;
				rampGain(gain, stopAt, 0, seconds);
				source.stop(stopAt + seconds);
			},
		};
	}

	public dispose(): void {
		const audioContext = this.audioContext;
		this.audioContext = undefined;
		this.buffers = new WeakMap();
		if (audioContext !== undefined && audioContext.state !== "closed") {
			void audioContext.close().catch(() => {});
		}
	}

	private resolveContext(): AudioContext | undefined {
		this.audioContext ??= createAudioContext();
		if (this.audioContext === undefined) return undefined;

		if (this.audioContext.state === "suspended") {
			void this.audioContext.resume().catch(() => {});
		}
		return this.audioContext;
	}

	private resolveBuffer(
		audioContext: AudioContext,
		sound: Sound,
	): AudioBuffer {
		return match(sound)
			.with({ type: "generated" }, ({ createSamples }) =>
				this.resolveGeneratedBuffer(audioContext, createSamples),
			)
			.exhaustive();
	}

	private resolveGeneratedBuffer(
		audioContext: AudioContext,
		createSamples: CreateSamples,
	): AudioBuffer {
		const cached = this.buffers.get(createSamples);
		if (cached !== undefined) return cached;

		const samples = createSamples(audioContext.sampleRate);
		const buffer = audioContext.createBuffer(
			1,
			samples.length,
			audioContext.sampleRate,
		);
		buffer.getChannelData(0).set(samples);

		this.buffers.set(createSamples, buffer);
		return buffer;
	}
}

const createAudioContext = (): AudioContext | undefined => {
	if (typeof window.AudioContext === "undefined") return undefined;

	try {
		return new window.AudioContext();
	} catch {
		return undefined;
	}
};

const rampGain = (
	gain: GainNode,
	startAt: number,
	target: number,
	fadeSeconds: number,
): void => {
	const currentGain = gain.gain.value;

	gain.gain.cancelScheduledValues(startAt);
	if (fadeSeconds <= 0) {
		gain.gain.setValueAtTime(target, startAt);
		return;
	}

	gain.gain.setValueAtTime(currentGain, startAt);
	gain.gain.linearRampToValueAtTime(target, startAt + fadeSeconds);
};
