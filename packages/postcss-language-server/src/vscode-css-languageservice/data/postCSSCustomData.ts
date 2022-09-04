import { CSSDataV1 } from '../cssLanguageTypes';

export const postCSSCustomData: CSSDataV1 = {
	version: 1,
	properties: [
		{
			name: 'composes',
			status: 'nonstandard',
			references: [
				{
					name: 'CSS Modules Reference',
					url: 'https://github.com/css-modules/css-modules#composition'
				}
			],
			description: 'CSS Modules composes multiple selectors into one. This property allows you to specify which selectors should be composed into one.',
		}
	],

	atDirectives: [
		{
			"name": "@custom-media",
			"browsers": [],
			status: "experimental",
			"description": "An at-rule for defining aliases that represent media queries."
		},
		{
			"name": "@custom-selector",
			"browsers": [],
			status: "experimental",
			"description": "An at-rule for defining aliases that represent selectors."
		},
		{
			"name": "@nest",
			"references": [
				{
					"name": "W3 Reference",
					"url": "https://www.w3.org/TR/css-nesting-1/#at-nest"
				}
			],
			status: "experimental",
			"description": "Nested keyword."
		},
		{
			"name": "@define-mixin",
			status: "nonstandard",
			"description": "SCSS @mixin declaration replacement."
		},
	],

	pseudoClasses: [],
	pseudoElements: []
};