import {
	AST_NODE_TYPES,
	ESLintUtils,
	TSESTree,
} from "@typescript-eslint/utils";
import type * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator((name) => `local/${name}`);

//
// AST helpers
//

const MAX_CHAIN_DEPTH = 20;

const getChainRootName = (node: TSESTree.Node): string | null => {
	let current: TSESTree.Node = node;
	for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth++) {
		if (current.type === AST_NODE_TYPES.AwaitExpression) {
			current = current.argument;
		} else if (current.type === AST_NODE_TYPES.CallExpression) {
			current = current.callee;
		} else if (current.type === AST_NODE_TYPES.MemberExpression) {
			current = current.object;
		} else {
			break;
		}
	}
	return current.type === AST_NODE_TYPES.Identifier ? current.name : null;
};

const isAssertStatement = (statement: TSESTree.Statement): boolean =>
	statement.type === AST_NODE_TYPES.ExpressionStatement &&
	getChainRootName(statement.expression) === "expect";

//
// Rule
//

const vitestAaaOrder = createRule({
	name: "vitest-aaa-order",
	meta: {
		type: "problem",
		docs: {
			description:
				"Require assertions to be grouped together as a single block (Arrange-Act-Assert order). A non-assertion statement between two assertions means the test is verifying more than one step and should be split into separate tests.",
		},
		messages: {
			assertGap:
				"This statement interrupts a block of assertions. A test should verify one step: either move this statement before the assertions begin, or split the later assertions into their own test (Arrange-Act-Assert order).",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			BlockStatement(node) {
				const assertFlags = node.body.map(isAssertStatement);
				const firstAssertIndex = assertFlags.indexOf(true);
				if (firstAssertIndex === -1) return;
				const lastAssertIndex = assertFlags.lastIndexOf(true);

				for (const statement of node.body.slice(
					firstAssertIndex,
					lastAssertIndex + 1,
				)) {
					if (!isAssertStatement(statement)) {
						context.report({
							node: statement,
							messageId: "assertGap",
						});
					}
				}
			},
		};
	},
});

const hasMethod = (
	type: ts.Type,
	checker: ts.TypeChecker,
	name: string,
): boolean => {
	const method = type.getProperty(name);
	if (method === undefined) return false;
	return checker.getTypeOfSymbol(method).getCallSignatures().length > 0;
};

const teardownMethods = ["dispose", "onunload"];

const getEnclosingClass = (
	node: TSESTree.Node,
): TSESTree.ClassDeclaration | TSESTree.ClassExpression | null => {
	for (
		let current: TSESTree.Node | undefined = node.parent;
		current != null;
		current = current.parent
	) {
		if (
			current.type === AST_NODE_TYPES.ClassDeclaration ||
			current.type === AST_NODE_TYPES.ClassExpression
		) {
			return current;
		}
	}
	return null;
};

const requireDispose = createRule({
	name: "require-dispose",
	meta: {
		type: "problem",
		docs: {
			description:
				"Require a class that constructs a disposable to implement dispose() itself, so teardown propagates down the whole ownership chain. Disposables built elsewhere and injected are the caller's to tear down, and are ignored.",
		},
		messages: {
			missingDispose:
				"`{{constructed}}` is disposable, so `{{className}}` must implement dispose() and tear it down there.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const services = ESLintUtils.getParserServices(context);
		const checker = services.program.getTypeChecker();

		return {
			NewExpression(node) {
				if (
					!hasMethod(
						services.getTypeAtLocation(node),
						checker,
						"dispose",
					)
				) {
					return;
				}

				const enclosingClass = getEnclosingClass(node);
				if (enclosingClass === null) return;

				const instanceType = checker.getDeclaredTypeOfSymbol(
					services.getTypeAtLocation(enclosingClass).symbol,
				);
				if (
					teardownMethods.some((name) =>
						hasMethod(instanceType, checker, name),
					)
				) {
					return;
				}

				context.report({
					node,
					messageId: "missingDispose",
					data: {
						constructed: context.sourceCode.getText(node.callee),
						className: enclosingClass.id?.name ?? "this class",
					},
				});
			},
		};
	},
});

//
// Plugin
//

export default {
	meta: {
		name: "eslint-plugin-local",
		version: "0.0.0",
	},
	rules: {
		"vitest-aaa-order": vitestAaaOrder,
		"require-dispose": requireDispose,
	},
};
