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

const getAssignedFieldName = (node: TSESTree.Node): string | null => {
	for (
		let current: TSESTree.Node | undefined = node.parent;
		current != null;
		current = current.parent
	) {
		if (current.type === AST_NODE_TYPES.PropertyDefinition) {
			return current.key.type === AST_NODE_TYPES.Identifier
				? current.key.name
				: null;
		}
		if (current.type === AST_NODE_TYPES.AssignmentExpression) {
			const { left } = current;
			return left.type === AST_NODE_TYPES.MemberExpression &&
				left.object.type === AST_NODE_TYPES.ThisExpression &&
				left.property.type === AST_NODE_TYPES.Identifier
				? left.property.name
				: null;
		}
		if (current.type === AST_NODE_TYPES.ClassBody) return null;
	}
	return null;
};

const getDisposedFieldName = (node: TSESTree.CallExpression): string | null => {
	const { callee } = node;
	if (
		callee.type !== AST_NODE_TYPES.MemberExpression ||
		callee.property.type !== AST_NODE_TYPES.Identifier ||
		callee.property.name !== "dispose"
	) {
		return null;
	}
	const target = callee.object;
	return target.type === AST_NODE_TYPES.MemberExpression &&
		target.object.type === AST_NODE_TYPES.ThisExpression &&
		target.property.type === AST_NODE_TYPES.Identifier
		? target.property.name
		: null;
};

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

const requireDispose = createRule({
	name: "require-dispose",
	meta: {
		type: "problem",
		docs: {
			description:
				"Require a class that constructs a disposable to implement dispose() itself and tear that disposable down there, so teardown propagates down the whole ownership chain. Disposables built elsewhere and injected are the caller's to tear down, and are ignored.",
		},
		messages: {
			missingDispose:
				"`{{constructed}}` is disposable, so `{{className}}` must implement dispose() and tear it down there.",
			missingTeardown:
				"`{{className}}` constructs `{{constructed}}` but never calls `this.{{property}}.dispose()`.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const services = ESLintUtils.getParserServices(context);
		const checker = services.program.getTypeChecker();

		const constructed = new Map<
			ClassNode,
			{ node: TSESTree.NewExpression; property: string | null }[]
		>();
		const disposed = new Map<ClassNode, Set<string>>();

		const hasTeardownMethod = (node: ClassNode): boolean => {
			const instanceType = checker.getDeclaredTypeOfSymbol(
				services.getTypeAtLocation(node).symbol,
			);
			return teardownMethods.some((name) =>
				hasMethod(instanceType, checker, name),
			);
		};

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

				const entries = constructed.get(enclosingClass) ?? [];
				entries.push({ node, property: getAssignedFieldName(node) });
				constructed.set(enclosingClass, entries);
			},
			CallExpression(node) {
				const property = getDisposedFieldName(node);
				const enclosingClass = getEnclosingClass(node);
				if (property === null || enclosingClass === null) return;

				const properties = disposed.get(enclosingClass) ?? new Set();
				properties.add(property);
				disposed.set(enclosingClass, properties);
			},
			"Program:exit"() {
				for (const [enclosingClass, entries] of constructed) {
					const className = enclosingClass.id?.name ?? "this class";
					const hasTeardown = hasTeardownMethod(enclosingClass);
					for (const { node, property } of entries) {
						const data = {
							constructed: context.sourceCode.getText(
								node.callee,
							),
							className,
							property: property ?? "",
						};
						if (!hasTeardown) {
							context.report({
								node,
								messageId: "missingDispose",
								data,
							});
						} else if (
							property !== null &&
							disposed.get(enclosingClass)?.has(property) !== true
						) {
							context.report({
								node,
								messageId: "missingTeardown",
								data,
							});
						}
					}
				}
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
