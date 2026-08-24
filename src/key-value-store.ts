//
// Value
//

export type StorableValue =
	| string
	| number
	| boolean
	| null
	| StorableValue[]
	| { [key: string]: StorableValue };

type StoredTypes = {
	string: string;
	number: number;
	boolean: boolean;
	object: Record<string, StorableValue>;
	unknown: unknown;
};

export type StoredType = keyof StoredTypes;

export class StoredValue {
	private readonly value: unknown;

	constructor(value: unknown) {
		this.value = value;
	}

	private static hasType<TType extends StoredType>(
		value: unknown,
		type: TType,
	): value is StoredTypes[TType] {
		if (type === "unknown") return true;
		if (type === "object") {
			return (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value)
			);
		}
		return typeof value === type;
	}

	public as<TType extends StoredType>(
		type: TType,
	): StoredTypes[TType] | null {
		return StoredValue.hasType(this.value, type) ? this.value : null;
	}
}

//
// Store
//

export class KeyValueStore {
	private readonly uniqueKey: string;

	private readonly localStorage: Storage;

	constructor(uniqueKey: string) {
		this.uniqueKey = uniqueKey;
		this.localStorage = window.localStorage;
	}

	public set(key: string, value: StorableValue): void {
		this.localStorage.setItem(this.storageKey(key), JSON.stringify(value));
	}

	public get(key: string): StoredValue | null {
		const raw = this.localStorage.getItem(this.storageKey(key));
		if (raw === null) return null;

		try {
			const parsed: unknown = JSON.parse(raw);
			return new StoredValue(parsed);
		} catch {
			return null;
		}
	}

	public delete(key: string): void {
		this.localStorage.removeItem(this.storageKey(key));
	}

	private storageKey(key: string): string {
		return `${this.uniqueKey}:${key}`;
	}
}
