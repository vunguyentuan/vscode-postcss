import { CSSDataV1 } from '../cssLanguageTypes';

export const postCSSCustomData: CSSDataV1 = {
	version: 1,
	properties: [
		
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
	]
};