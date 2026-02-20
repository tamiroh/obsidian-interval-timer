export class KeyValueStore {
	private readonly uniqueKey: string;

	private readonly localStorage: Storage;

	constructor(uniqueKey: string) {
		this.uniqueKey = uniqueKey;
		this.localStorage = window.localStorage;
	}

	public set(key: string, value: string): void {
		this.localStorage.setItem(`${this.uniqueKey}:${key}`, value);
	}

	public get(key: string): string | null {
		return this.localStorage.getItem(`${this.uniqueKey}:${key}`);
	}

	public delete(key: string): void {
		this.localStorage.removeItem(`${this.uniqueKey}:${key}`);
	}
}
