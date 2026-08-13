export type Result<T, R extends string> =
	{ ok: true; value: T } | { ok: false; reason: R };

export type ResultFailureReason<T extends Result<unknown, string>> = Extract<
	T,
	{ ok: false }
>["reason"];

export function ok(): Result<void, never>;
export function ok<T>(value: T): Result<T, never>;
export function ok(...args: [] | [value: unknown]): Result<unknown, never> {
	return args.length === 0
		? { ok: true, value: undefined }
		: { ok: true, value: args[0] };
}

export function err<R extends string>(reason: R): Result<never, R> {
	return { ok: false, reason };
}
