/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CSSDataV1 } from '../cssLanguageTypes';
import { postCSSCustomData } from './postCSSCustomData';
import { getDefaultCSSDataProvider } from 'vscode-css-languageservice';

const cssProvider = getDefaultCSSDataProvider();
export const cssData : CSSDataV1 = {
	version: 1.1,
	atDirectives: cssProvider.provideAtDirectives().concat(postCSSCustomData.atDirectives),
	properties: cssProvider.provideProperties().concat(postCSSCustomData.properties),
	pseudoClasses: cssProvider.providePseudoClasses().concat(postCSSCustomData.pseudoClasses),
	pseudoElements: cssProvider.providePseudoElements().concat(postCSSCustomData.pseudoElements),
};