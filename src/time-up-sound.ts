import { type AudioOutput, GeneratedSound } from "./audio-output";

const beepFrequencyHz = 2_000;

const beepDurationSeconds = 0.09;

const beepGapSeconds = 0.06;

const beepCount = 3;

const edgeFadeSeconds = 0.004;

const maxGain = 0.25;

export class TimeUpSound {
	private readonly audioOutput: AudioOutput;

	constructor(audioOutput: AudioOutput) {
		this.audioOutput = audioOutput;
	}

	public play(volume: number): void {
		if (volume <= 0) return;

		this.audioOutput.play(beepSequence, {
			mode: "once",
			gain: maxGain * Math.min(volume / 100, 1),
		});
	}
}

const beepSequence = new GeneratedSound((sampleRate) => {
	const beepFrames = Math.ceil(sampleRate * beepDurationSeconds);
	const gapFrames = Math.ceil(sampleRate * beepGapSeconds);
	const cycleFrames = beepFrames + gapFrames;
	const samples = new Float32Array(cycleFrames * beepCount - gapFrames);

	for (let frame = 0; frame < samples.length; frame += 1) {
		const positionInCycle = frame % cycleFrames;
		if (positionInCycle >= beepFrames) continue;

		const beepSeconds = positionInCycle / sampleRate;
		const edgeFade = Math.min(
			1,
			beepSeconds / edgeFadeSeconds,
			(beepDurationSeconds - beepSeconds) / edgeFadeSeconds,
		);
		samples[frame] =
			Math.sin(2 * Math.PI * beepFrequencyHz * beepSeconds) * edgeFade;
	}

	return samples;
});
