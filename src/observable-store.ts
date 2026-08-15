import { useLayoutEffect, useState } from "preact/hooks";

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

export const useObservableStore = <T extends object>(
	store: ObservableStore<T>,
): T => {
	const [snapshot, setSnapshot] = useState(store.getSnapshot);
	useLayoutEffect(() => {
		const unsubscribe = store.subscribe(() =>
			setSnapshot(store.getSnapshot()),
		);
		setSnapshot(store.getSnapshot());
		return unsubscribe;
	}, [store]);
	return snapshot;
};
