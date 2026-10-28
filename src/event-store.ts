import type { FileSystem } from "./file-system";

type EventStoreOptions<T> = {
	readonly fileSystem: FileSystem;
	readonly directory: string;
	readonly parse: (value: unknown) => T | null;
	readonly onError?: (error: unknown) => void;
	readonly createId?: () => string;
};

export class EventStore<T extends { occurredAt: Date }> {
	private pendingWrite = Promise.resolve();

	private readonly fileSystem: FileSystem;

	private readonly directory: string;

	private readonly parse: (value: unknown) => T | null;

	private readonly onError: (error: unknown) => void;

	private readonly createId: () => string;

	constructor({
		fileSystem,
		directory,
		parse,
		onError = () => {},
		createId = () => crypto.randomUUID(),
	}: EventStoreOptions<T>) {
		this.fileSystem = fileSystem;
		this.directory = directory;
		this.parse = parse;
		this.onError = onError;
		this.createId = createId;
	}

	public record(event: T): void {
		this.pendingWrite = this.pendingWrite
			.then(async () => {
				if (!(await this.fileSystem.exists(this.directory))) {
					await this.fileSystem.mkdir(this.directory);
				}
				const timestamp = event.occurredAt
					.toISOString()
					.replace(/:/g, "-");
				await this.fileSystem.write(
					`${this.directory}/${timestamp}_${this.createId()}.json`,
					`${JSON.stringify(event, null, "\t")}\n`,
				);
			})
			.catch((error: unknown) => {
				this.onError(error);
			});
	}

	public async find(): Promise<T[]> {
		await this.pendingWrite;

		if (!(await this.fileSystem.exists(this.directory))) return [];

		const { files } = await this.fileSystem.list(this.directory);
		const events = await Promise.all(
			files
				.filter((file) => file.endsWith(".json"))
				.sort()
				.map((file) => this.read(file)),
		);
		return events.filter((event) => event !== null);
	}

	private async read(path: string): Promise<T | null> {
		try {
			return this.parse(JSON.parse(await this.fileSystem.read(path)));
		} catch (error) {
			this.onError(error);
			return null;
		}
	}
}
