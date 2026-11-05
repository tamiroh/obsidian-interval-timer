import path from "node:path";
import stylelint from "stylelint";

const ruleName = "local/selector-class-module-pattern";

const messages = stylelint.utils.ruleMessages(ruleName, {
	rejected: (className, ownModule) =>
		`Expected ".${className}" to start with "interval-timer-${ownModule}-"`,
});

const foreignClasses = new Set(["cm-line", "mod-clickable", "status-bar-item"]);

const deriveModule = (file) =>
	path.basename(file, ".css").replace(/^obsidian-/, "");

const rule = (primary, secondaryOptions) => (root, result) => {
	if (primary !== true) return;

	const file = root.source?.input.file;
	if (!file) return;

	const ownModule = secondaryOptions?.moduleOverride ?? deriveModule(file);
	const allowedModules = [
		ownModule,
		...(secondaryOptions?.allowModules ?? []),
	];
	const pattern = new RegExp(
		`^interval-timer-(${allowedModules.join("|")})(-[a-z0-9]+)*$`,
	);

	root.walkRules((ruleNode) => {
		const classTokens =
			ruleNode.selector.match(/\.-?[_a-zA-Z][\w-]*/g) ?? [];
		for (const token of classTokens) {
			const className = token.slice(1);
			if (foreignClasses.has(className) || pattern.test(className)) {
				continue;
			}

			stylelint.utils.report({
				ruleName,
				result,
				node: ruleNode,
				message: messages.rejected(className, ownModule),
			});
		}
	});
};

rule.ruleName = ruleName;
rule.messages = messages;

export default stylelint.createPlugin(ruleName, rule);
