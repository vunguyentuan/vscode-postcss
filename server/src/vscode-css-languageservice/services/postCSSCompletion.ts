/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { CSSCompletion } from './cssCompletion';
import * as nodes from '../parser/cssNodes';
import { CompletionList, CompletionItemKind, TextEdit, InsertTextFormat, CompletionItem, MarkupContent, IReference, LanguageServiceOptions, IPropertyData } from '../cssLanguageTypes';
import * as nls from 'vscode-nls';
import { CSSDataManager } from '../languageFacts/dataManager';

const localize = nls.loadMessageBundle();

interface IFunctionInfo {
	func: string;
	desc?: string;
	type?: string;
}

export class PostCSSCompletion extends CSSCompletion {

	private static variableDefaults: { [key: string]: string; } = {
		'$red': '1',
		'$green': '2',
		'$blue': '3',
		'$alpha': '1.0',
		'$color': '#000000',
		'$weight': '0.5',
		'$hue': '0',
		'$saturation': '0%',
		'$lightness': '0%',
		'$degrees': '0',
		'$amount': '0',
		'$string': '""',
		'$substring': '"s"',
		'$number': '0',
		'$limit': '1'
	};

	private static colorProposals: IFunctionInfo[] = [
		{ func: 'color($colorSpace $arg1 $arg2 $arg3)', desc: localize('postcss.builtin.color', 'The color function takes parameters specifying a color, in an explicitly listed color space.') },
	];

	private static selectorFuncs: IFunctionInfo[] = [
		{ func: 'selector-nest($selectors…)', desc: localize('postcss.builtin.selector-nest', 'Nests selector beneath one another like they would be nested in the stylesheet.') },
		{ func: 'selector-append($selectors…)', desc: localize('postcss.builtin.selector-append', 'Appends selectors to one another without spaces in between.') },
		{ func: 'selector-extend($selector, $extendee, $extender)', desc: localize('postcss.builtin.selector-extend', 'Extends $extendee with $extender within $selector.') },
		{ func: 'selector-replace($selector, $original, $replacement)', desc: localize('postcss.builtin.selector-replace', 'Replaces $original with $replacement within $selector.') },
		{ func: 'selector-unify($selector1, $selector2)', desc: localize('postcss.builtin.selector-unify', 'Unifies two selectors to produce a selector that matches elements matched by both.') },
		{ func: 'is-superselector($super, $sub)', desc: localize('postcss.builtin.is-superselector', 'Returns whether $super matches all the elements $sub does, and possibly more.') },
		{ func: 'simple-selectors($selector)', desc: localize('postcss.builtin.simple-selectors', 'Returns the simple selectors that comprise a compound selector.') },
		{ func: 'selector-parse($selector)', desc: localize('postcss.builtin.selector-parse', 'Parses a selector into the format returned by &.') }
	];

	private static builtInFuncs: IFunctionInfo[] = [
		{ func: 'env($variable)', desc: localize('postcss.builtin.env', 'The env() CSS function can be used to insert the value of a user agent-defined environment variable into your CSS, in a similar fashion to the var() function and custom properties.') },
	];

	private static postcssAtDirectives = [
		{
			label: "@nest",
			documentation: localize("postcss.builtin.@nest", "Inherits the styles of another selector."),
			kind: CompletionItemKind.Keyword
		},
	];

	private static postcssModuleLoaders = [
		{
			label: "@use",
			documentation: localize("postcss.builtin.@use", "Loads mixins, functions, and variables from other Sass stylesheets as 'modules', and combines CSS from multiple stylesheets together."),
			references: [{ name: 'Sass documentation', url: 'https://sass-lang.com/documentation/at-rules/use' }],
			insertText: "@use $0;",
			insertTextFormat: InsertTextFormat.Snippet,
			kind: CompletionItemKind.Keyword
		},
		{
			label: "@forward",
			documentation: localize("postcss.builtin.@forward", "Loads a Sass stylesheet and makes its mixins, functions, and variables available when this stylesheet is loaded with the @use rule."),
			references: [{ name: 'Sass documentation', url: 'https://sass-lang.com/documentation/at-rules/forward' }],
			insertText: "@forward $0;",
			insertTextFormat: InsertTextFormat.Snippet,
			kind: CompletionItemKind.Keyword
		},
	];

	private static postcssModuleBuiltIns = [
		{
			label: 'sass:math',
			documentation: localize('postcss.builtin.sass:math', 'Provides functions that operate on numbers.'),
			references: [{ name: 'Sass documentation', url: 'https://sass-lang.com/documentation/modules/math' }]
		},
		{
			label: 'sass:string',
			documentation: localize('postcss.builtin.sass:string', 'Makes it easy to combine, search, or split apart strings.'),
			references: [{ name: 'Sass documentation', url: 'https://sass-lang.com/documentation/modules/string' }]
		},
		{
			label: 'sass:color',
			documentation: localize('postcss.builtin.sass:color', 'Generates new colors based on existing ones, making it easy to build color themes.'),
			references: [{ name: 'Sass documentation', url: 'https://sass-lang.com/documentation/modules/color' }]
		},
		{
			label: 'sass:list',
			documentation: localize('postcss.builtin.sass:list', 'Lets you access and modify values in lists.'),
			references: [{ name: 'Sass documentation', url: 'https://sass-lang.com/documentation/modules/list' }]
		},
		{
			label: 'sass:map',
			documentation: localize('postcss.builtin.sass:map', 'Makes it possible to look up the value associated with a key in a map, and much more.'),
			references: [{ name: 'Sass documentation', url: 'https://sass-lang.com/documentation/modules/map' }]
		},
		{
			label: 'sass:selector',
			documentation: localize('postcss.builtin.sass:selector', 'Provides access to Sass’s powerful selector engine.'),
			references: [{ name: 'Sass documentation', url: 'https://sass-lang.com/documentation/modules/selector' }]
		},
		{
			label: 'sass:meta',
			documentation: localize('postcss.builtin.sass:meta', 'Exposes the details of Sass’s inner workings.'),
			references: [{ name: 'Sass documentation', url: 'https://sass-lang.com/documentation/modules/meta' }]
		},
	];


	constructor(lsServiceOptions: LanguageServiceOptions, cssDataManager: CSSDataManager) {
		super('$', lsServiceOptions, cssDataManager);

		addReferencesToDocumentation(PostCSSCompletion.postcssModuleLoaders);
		addReferencesToDocumentation(PostCSSCompletion.postcssModuleBuiltIns);
	}

	protected isImportPathParent(type: nodes.NodeType): boolean {
		return type === nodes.NodeType.Forward
			|| type === nodes.NodeType.Use
			|| super.isImportPathParent(type);
	}

	public getCompletionForImportPath(importPathNode: nodes.Node, result: CompletionList): CompletionList {
		const parentType = importPathNode.getParent()!.type;

		if (parentType === nodes.NodeType.Forward || parentType === nodes.NodeType.Use) {
			for (const p of PostCSSCompletion.postcssModuleBuiltIns) {
				const item: CompletionItem = {
					label: p.label,
					documentation: p.documentation,
					textEdit: TextEdit.replace(this.getCompletionRange(importPathNode), `'${p.label}'`),
					kind: CompletionItemKind.Module
				};
				result.items.push(item);
			}
		}

		return super.getCompletionForImportPath(importPathNode, result);
	}

	private createReplaceFunction() {
		let tabStopCounter = 1;

		return (_match: string, p1: string) => {
			return '${' + tabStopCounter++ + ':' + p1 + '}';
		};
	}

	private createFunctionProposals(proposals: IFunctionInfo[], existingNode: nodes.Node | null, sortToEnd: boolean, result: CompletionList): CompletionList {
		for (const p of proposals) {
			const insertText = p.func.replace(/\[?\$(\w+)\]?/g, this.createReplaceFunction());
			const label = p.func.substr(0, p.func.indexOf('('));
			const item: CompletionItem = {
				label: label,
				detail: p.func,
				documentation: p.desc,
				textEdit: TextEdit.replace(this.getCompletionRange(existingNode), insertText),
				insertTextFormat: InsertTextFormat.Snippet,
				kind: CompletionItemKind.Function
			};
			if (sortToEnd) {
				item.sortText = 'z';
			}
			result.items.push(item);
		}
		return result;
	}

	public getCompletionsForSelector(ruleSet: nodes.RuleSet | null, isNested: boolean, result: CompletionList): CompletionList {
		this.createFunctionProposals(PostCSSCompletion.selectorFuncs, null, true, result);
		return super.getCompletionsForSelector(ruleSet, isNested, result);
	}

	public getTermProposals(entry: IPropertyData | undefined, existingNode: nodes.Node, result: CompletionList): CompletionList {
		let functions = PostCSSCompletion.builtInFuncs;
		if (entry) {
			functions = functions.filter(f => !f.type || !entry.restrictions || entry.restrictions.indexOf(f.type) !== -1);
		}
		this.createFunctionProposals(functions, existingNode, true, result);
		return super.getTermProposals(entry, existingNode, result);
	}

	protected getColorProposals(entry: IPropertyData, existingNode: nodes.Node, result: CompletionList): CompletionList {
		this.createFunctionProposals(PostCSSCompletion.colorProposals, existingNode, false, result);
		return super.getColorProposals(entry, existingNode, result);
	}

	public getCompletionsForDeclarationProperty(declaration: nodes.Declaration, result: CompletionList): CompletionList {
		this.getCompletionForAtDirectives(result);
		this.getCompletionsForSelector(null, true, result);
		return super.getCompletionsForDeclarationProperty(declaration, result);
	}

	public getCompletionsForExtendsReference(_extendsRef: nodes.ExtendsReference, existingNode: nodes.Node, result: CompletionList): CompletionList {
		const symbols = this.getSymbolContext().findSymbolsAtOffset(this.offset, nodes.ReferenceType.Rule);
		for (const symbol of symbols) {
			const suggest: CompletionItem = {
				label: symbol.name,
				textEdit: TextEdit.replace(this.getCompletionRange(existingNode), symbol.name),
				kind: CompletionItemKind.Function,
			};
			result.items.push(suggest);
		}
		return result;
	}

	public getCompletionForAtDirectives(result: CompletionList): CompletionList {
		result.items.push(...PostCSSCompletion.postcssAtDirectives);
		return result;
	}

	public getCompletionForTopLevel(result: CompletionList): CompletionList {
		this.getCompletionForAtDirectives(result);
		this.getCompletionForModuleLoaders(result);
		super.getCompletionForTopLevel(result);
		return result;
	}

	public getCompletionForModuleLoaders(result: CompletionList): CompletionList {
		result.items.push(...PostCSSCompletion.postcssModuleLoaders);
		return result;
	}
}

/**
 * Todo @Pine: Remove this and do it through custom data
 */
function addReferencesToDocumentation(items: (CompletionItem & { references?: IReference[] })[]) {
	items.forEach(i => {
		if (i.documentation && i.references && i.references.length > 0) {
			const markdownDoc: MarkupContent =
				typeof i.documentation === 'string'
					? { kind: 'markdown', value: i.documentation }
					: { kind: 'markdown', value: i.documentation.value };

			markdownDoc.value += '\n\n';
			markdownDoc.value += i.references
				.map(r => {
					return `[${r.name}](${r.url})`;
				})
				.join(' | ');

			i.documentation = markdownDoc;
		}
	});
}