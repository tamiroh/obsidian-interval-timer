export const isBlank = (
	value: string | null | undefined,
): value is "" | null | undefined =>
	value === null || value === undefined || value === "";
