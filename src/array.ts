export const last = <T>(array: T[]): T | undefined => array[array.length - 1];

export const clear = <T>(array: T[]): void => {
	array.length = 0;
};
