import { useLayoutEffect, useState } from "preact/hooks";

export class ObservableStore<T extends object> {
	private currentState: T;

	private readonly listeners = new Set<() => void>();

	constructor(initialState: T) {
		this.currentState = initialState;
	}

	public get state(): Readonly<T> {
		return this.currentState;
	}

	public readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	public update(patch: Partial<T>): void {
		this.currentState = { ...this.currentState, ...patch };
		this.listeners.forEach((listener) => {
			listener();
		});
	}
}

export const useObservableStore = <T extends object>(
	store: ObservableStore<T>,
): T => {
	const [state, setState] = useState(store.state);
	useLayoutEffect(() => {
		const unsubscribe = store.subscribe(() => {
			setState(store.state);
		});
		setState(store.state);
		return unsubscribe;
	}, [store]);
	return state;
};
