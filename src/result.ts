export type Result<T, R extends string> =
	{ ok: true; value: T } | { ok: false; reason: R };

export type ResultFailureReason<T extends Result<unknown, string>> = Extract<
	T,
	{ ok: false }
>["reason"];
