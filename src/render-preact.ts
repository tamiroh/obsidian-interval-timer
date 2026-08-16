import { ComponentChild, render as preactRender } from "preact";

const containers = new Set<HTMLElement>();

export const render = (vnode: ComponentChild): HTMLElement => {
	const container = createDiv();
	document.body.append(container);
	containers.add(container);
	preactRender(vnode, container);
	return container;
};

export const cleanup = (): void => {
	containers.forEach((container) => {
		preactRender(null, container);
		container.remove();
	});
	containers.clear();
};
