import type { FileSystem } from "./filesystem";
import { type Infer, type Schema, validate } from "./schema";

export type EventSchema = Schema & {
	type: "object";
	properties: { occurredAt: { type: "date" } };
};

type EventStoreOptions<S extends EventSchema> = {
	fileSystem: FileSystem;
	rootDirectory: string;
	schema: S;
	getOccurredAt: (event: Infer<S>) => Date;
	onError?: () => void;
	createId?: () => string;
};

export class EventStore<S extends EventSchema> {
	private pendingWrite = Promise.resolve();

	private readonly fileSystem: FileSystem;

	private readonly rootDirectory: string;

	private readonly schema: S;

	private readonly getOccurredAt: (event: Infer<S>) => Date;

	private readonly onError: () => void;

	private readonly createId: () => string;

	constructor({
		fileSystem,
		rootDirectory,
		schema,
		getOccurredAt,
		onError = () => {},
		createId = () => crypto.randomUUID(),
	}: EventStoreOptions<S>) {
		this.fileSystem = fileSystem;
		this.rootDirectory = rootDirectory;
		this.schema = schema;
		this.getOccurredAt = getOccurredAt;
		this.onError = onError;
		this.createId = createId;
	}

	public record(event: Infer<S>): void {
		this.pendingWrite = this.pendingWrite
			.then(async () => {
				const occurredAt = this.getOccurredAt(event).toISOString();
				await this.createDirectoryIfMissing(this.rootDirectory);
				await this.fileSystem.write(
					`${this.rootDirectory}/${occurredAt.replace(/:/g, "-")}_${this.createId()}.json`,
					`${JSON.stringify(event, null, "\t")}\n`,
				);
			})
			.catch(() => this.onError());
	}

	public async find(): Promise<Infer<S>[]> {
		await this.pendingWrite;

		if (!(await this.fileSystem.exists(this.rootDirectory))) return [];

		const { files } = await this.fileSystem.list(this.rootDirectory);
		const parsedEvents: (Infer<S> | null)[] = await Promise.all(
			files
				.filter((file) => file.endsWith(".json"))
				.map((file) => this.read(file)),
		);

		return parsedEvents
			.filter((event) => event !== null)
			.sort(
				(a, b) =>
					this.getOccurredAt(a).getTime() -
					this.getOccurredAt(b).getTime(),
			);
	}

	public flush(): Promise<void> {
		return this.pendingWrite;
	}

	private async createDirectoryIfMissing(path: string): Promise<void> {
		if (!(await this.fileSystem.exists(path))) {
			await this.fileSystem.mkdir(path);
		}
	}

	private async read(path: string): Promise<Infer<S> | null> {
		try {
			const result = validate(
				this.schema,
				JSON.parse(await this.fileSystem.read(path)),
			);
			return result.ok ? result.value : null;
		} catch {
			this.onError();
			return null;
		}
	}
}
