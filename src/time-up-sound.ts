import { type AudioOutput, GeneratedSound } from "./audio-output";

const beepFrequencyHz = 2_000;

const beepDurationSeconds = 0.06;

const withinBurstGapSeconds = 0.07;

const betweenBurstGapSeconds = 0.35;

const beepsPerBurst = 4;

const burstCount = 2;

const edgeFadeSeconds = 0.004;

const maxGain = 0.25;

const burstDurationSeconds =
	beepsPerBurst * beepDurationSeconds +
	(beepsPerBurst - 1) * withinBurstGapSeconds;

export class TimeUpSound {
	private readonly audioOutput: AudioOutput;

	constructor(audioOutput: AudioOutput) {
		this.audioOutput = audioOutput;
	}

	public play(volume: number): void {
		if (volume <= 0) return;

		this.audioOutput.play(beepBursts, {
			mode: "once",
			gain: maxGain * Math.min(volume / 100, 1),
		});
	}
}

const beepBursts = new GeneratedSound((sampleRate) => {
	const totalSeconds =
		burstCount * burstDurationSeconds +
		(burstCount - 1) * betweenBurstGapSeconds;
	const beepFrames = Math.round(beepDurationSeconds * sampleRate);
	const samples = new Float32Array(Math.ceil(sampleRate * totalSeconds));

	for (let burst = 0; burst < burstCount; burst += 1) {
		for (let beep = 0; beep < beepsPerBurst; beep += 1) {
			const startSeconds =
				burst * (burstDurationSeconds + betweenBurstGapSeconds) +
				beep * (beepDurationSeconds + withinBurstGapSeconds);
			const startFrame = Math.round(startSeconds * sampleRate);

			for (let offset = 0; offset < beepFrames; offset += 1) {
				const beepSeconds = offset / sampleRate;
				const edgeFade = Math.min(
					1,
					beepSeconds / edgeFadeSeconds,
					(beepDurationSeconds - beepSeconds) / edgeFadeSeconds,
				);
				samples[startFrame + offset] =
					Math.sin(2 * Math.PI * beepFrequencyHz * beepSeconds) *
					edgeFade;
			}
		}
	}

	return samples;
});
