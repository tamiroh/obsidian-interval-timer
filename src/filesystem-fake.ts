import type { FileSystem } from "./filesystem";

export class InMemoryFileSystem implements FileSystem {
	private readonly files = new Map<string, string>();

	private readonly directories = new Set<string>();

	public async exists(path: string): Promise<boolean> {
		if (this.directories.has(path) || this.files.has(path)) return true;
		const prefix = `${path}/`;
		return [...this.files.keys()].some((file) => file.startsWith(prefix));
	}

	public async mkdir(path: string): Promise<void> {
		this.directories.add(path);
	}

	public async write(path: string, data: string): Promise<void> {
		this.files.set(path, data);
	}

	public async list(
		path: string,
	): Promise<{ files: string[]; folders: string[] }> {
		const prefix = `${path}/`;
		return {
			files: [...this.files.keys()].filter((file) =>
				file.startsWith(prefix),
			),
			folders: [],
		};
	}

	public async read(path: string): Promise<string> {
		const data = this.files.get(path);
		if (data === undefined) throw new Error(`not found: ${path}`);
		return data;
	}

	public writeRaw(path: string, data: string): void {
		this.files.set(path, data);
	}
}
