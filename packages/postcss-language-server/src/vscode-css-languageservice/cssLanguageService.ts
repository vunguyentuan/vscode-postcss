/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { CSSHover } from './services/cssHover';
import { CSSCodeActions } from './services/cssCodeActions';
import { CSSValidation } from './services/cssValidation';
import { getFoldingRanges } from './services/cssFolding';

import {
  LanguageSettings,
  ICompletionParticipant,
  DocumentContext,
  LanguageServiceOptions,
  Diagnostic,
  Position,
  CompletionList,
  Hover,
  Location,
  DocumentHighlight,
  DocumentLink,
  SymbolInformation,
  Range,
  CodeActionContext,
  Command,
  CodeAction,
  ColorInformation,
  Color,
  ColorPresentation,
  WorkspaceEdit,
  FoldingRange,
  SelectionRange,
  TextDocument,
  ICSSDataProvider,
  CSSDataV1,
  HoverSettings,
  CompletionSettings,
} from './cssLanguageTypes';

import { CSSDataManager } from './languageFacts/dataManager';
import { CSSDataProvider } from './languageFacts/dataProvider';
import { getSelectionRanges } from './services/cssSelectionRange';
import { cssData } from './data/webCustomData';
import { PostCSSParser } from './parser/postCSSParser';
import { PostCSSCompletion } from './services/postCSSCompletion';
import { PostCSSNavigation } from './services/postCSSNavigation';

// eslint-disable-next-line @typescript-eslint/ban-types
export type Stylesheet = {}
export * from './cssLanguageTypes';

export interface LanguageService {
  configure(raw?: LanguageSettings): void
  setDataProviders(
    useDefaultDataProvider: boolean,
    customDataProviders: ICSSDataProvider[]
  ): void
  doValidation(
    document: TextDocument,
    stylesheet: Stylesheet,
    documentSettings?: LanguageSettings
  ): Diagnostic[]
  parseStylesheet(document: TextDocument): Stylesheet
  doComplete(
    document: TextDocument,
    position: Position,
    stylesheet: Stylesheet,
    settings?: CompletionSettings
  ): CompletionList
  doComplete2(
    document: TextDocument,
    position: Position,
    stylesheet: Stylesheet,
    documentContext: DocumentContext,
    settings?: CompletionSettings
  ): Promise<CompletionList>
  setCompletionParticipants(
    registeredCompletionParticipants: ICompletionParticipant[]
  ): void
  doHover(
    document: TextDocument,
    position: Position,
    stylesheet: Stylesheet,
    settings?: HoverSettings
  ): Hover | null
  findDefinition(
    document: TextDocument,
    position: Position,
    stylesheet: Stylesheet
  ): Location | null
  findReferences(
    document: TextDocument,
    position: Position,
    stylesheet: Stylesheet
  ): Location[]
  findDocumentHighlights(
    document: TextDocument,
    position: Position,
    stylesheet: Stylesheet
  ): DocumentHighlight[]
  findDocumentLinks(
    document: TextDocument,
    stylesheet: Stylesheet,
    documentContext: DocumentContext
  ): DocumentLink[]
  /**
   * Return statically resolved links, and dynamically resolved links if `fsProvider` is proved.
   */
  findDocumentLinks2(
    document: TextDocument,
    stylesheet: Stylesheet,
    documentContext: DocumentContext
  ): Promise<DocumentLink[]>
  findDocumentSymbols(
    document: TextDocument,
    stylesheet: Stylesheet
  ): SymbolInformation[]
  doCodeActions(
    document: TextDocument,
    range: Range,
    context: CodeActionContext,
    stylesheet: Stylesheet
  ): Command[]
  doCodeActions2(
    document: TextDocument,
    range: Range,
    context: CodeActionContext,
    stylesheet: Stylesheet
  ): CodeAction[]
  findDocumentColors(
    document: TextDocument,
    stylesheet: Stylesheet
  ): ColorInformation[]
  getColorPresentations(
    document: TextDocument,
    stylesheet: Stylesheet,
    color: Color,
    range: Range
  ): ColorPresentation[]
  doRename(
    document: TextDocument,
    position: Position,
    newName: string,
    stylesheet: Stylesheet
  ): WorkspaceEdit
  getFoldingRanges(
    document: TextDocument,
    context?: { rangeLimit?: number }
  ): FoldingRange[]
  getSelectionRanges(
    document: TextDocument,
    positions: Position[],
    stylesheet: Stylesheet
  ): SelectionRange[]
}

export function getDefaultCSSDataProvider(): ICSSDataProvider {
  return newCSSDataProvider(cssData);
}

export function newCSSDataProvider(data: CSSDataV1): ICSSDataProvider {
  return new CSSDataProvider(data);
}

function createFacade(
  parser: PostCSSParser,
  completion: PostCSSCompletion,
  hover: CSSHover,
  navigation: PostCSSNavigation,
  codeActions: CSSCodeActions,
  validation: CSSValidation,
  cssDataManager: CSSDataManager
): LanguageService {
  return {
    configure: (settings) => {
      validation.configure(settings);
      completion.configure(settings?.completion);
      hover.configure(settings?.hover);
    },
    setDataProviders: cssDataManager.setDataProviders.bind(cssDataManager),
    doValidation: validation.doValidation.bind(validation),
    parseStylesheet: parser.parseStylesheet.bind(parser),
    doComplete: completion.doComplete.bind(completion),
    doComplete2: completion.doComplete2.bind(completion),
    setCompletionParticipants:
      completion.setCompletionParticipants.bind(completion),
    doHover: hover.doHover.bind(hover),
    findDefinition: navigation.findDefinition.bind(navigation),
    findReferences: navigation.findReferences.bind(navigation),
    findDocumentHighlights: navigation.findDocumentHighlights.bind(navigation),
    findDocumentLinks: navigation.findDocumentLinks.bind(navigation),
    findDocumentLinks2: navigation.findDocumentLinks2.bind(navigation),
    findDocumentSymbols: navigation.findDocumentSymbols.bind(navigation),
    doCodeActions: codeActions.doCodeActions.bind(codeActions),
    doCodeActions2: codeActions.doCodeActions2.bind(codeActions),
    findDocumentColors: navigation.findDocumentColors.bind(navigation),
    getColorPresentations: navigation.getColorPresentations.bind(navigation),
    doRename: navigation.doRename.bind(navigation),
    getFoldingRanges,
    getSelectionRanges,
  };
}

const defaultLanguageServiceOptions = {};

export function getPostCSSLanguageService(
  options: LanguageServiceOptions = defaultLanguageServiceOptions
): LanguageService {
  const cssDataManager = new CSSDataManager(options);
  return createFacade(
    new PostCSSParser(),
    new PostCSSCompletion(options, cssDataManager),
    new CSSHover(options && options.clientCapabilities, cssDataManager),
    new PostCSSNavigation(options && options.fileSystemProvider),
    new CSSCodeActions(cssDataManager),
    new CSSValidation(cssDataManager),
    cssDataManager
  );
}
