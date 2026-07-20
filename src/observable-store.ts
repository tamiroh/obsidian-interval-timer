export class ObservableStore<T extends object> {
	private snapshot: T;

	private readonly listeners = new Set<() => void>();

	constructor(initialSnapshot: T) {
		this.snapshot = initialSnapshot;
	}

	public readonly getSnapshot = (): T => this.snapshot;

	public readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	public update(patch: Partial<T>): void {
		this.snapshot = { ...this.snapshot, ...patch };
		this.listeners.forEach((listener) => listener());
	}
}
