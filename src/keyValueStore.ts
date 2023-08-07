export class KeyValueStore {
	private readonly uniqueKey: string;

	private readonly localStorage: Storage;

	constructor(uniqueKey: string) {
		this.uniqueKey = uniqueKey;
		this.localStorage = window.localStorage;
	}

	public set = (key: string, value: string) => {
		this.localStorage[`${this.uniqueKey}:${key}`] = value;
	};

	public get = (key: string): string =>
		this.localStorage[`${this.uniqueKey}:${key}`];
}
