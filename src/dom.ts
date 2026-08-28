export const windowFor = (element: Element): Window =>
	element.ownerDocument.defaultView ?? window;

export const isElement = (value: unknown): value is Element =>
	value !== null &&
	typeof value === "object" &&
	"closest" in value &&
	typeof value.closest === "function";

export const isHtmlElement = (value: unknown): value is HTMLElement =>
	isElement(value) && "blur" in value && typeof value.blur === "function";
