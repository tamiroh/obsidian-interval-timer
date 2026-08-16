export const last = <T>(array: T[]): T | undefined => array[array.length - 1];

export const clear = (array: unknown[]): void => {
	array.length = 0;
};
