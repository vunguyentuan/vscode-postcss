import {
  createConnection,
  TextDocuments,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import {
  getPostCSSLanguageService,
  LanguageSettings,
  LanguageService,
  Stylesheet,
} from './vscode-css-languageservice/cssLanguageService';

import { getLanguageModelCache } from './languageModelCache';

export interface Settings {
  css: LanguageSettings
}

// Create a connection for the server.
const connection = createConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

const stylesheets = getLanguageModelCache<Stylesheet>(10, 60, (document) =>
  getLanguageService(document).parseStylesheet(document)
);
documents.onDidClose((e) => {
  stylesheets.onDocumentRemoved(e.document);
});
connection.onShutdown(() => {
  stylesheets.dispose();
});

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities.
connection.onInitialize((params: InitializeParams): InitializeResult => {
  const snippetSupport =
    params.capabilities &&
    params.capabilities.textDocument &&
    params.capabilities.textDocument.completion &&
    params.capabilities.textDocument.completion.completionItem &&
    params.capabilities.textDocument.completion.completionItem.snippetSupport;
  return {
    capabilities: {
      // Tell the client that the server works in FULL text document sync mode
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: snippetSupport ? { resolveProvider: false } : null,
      hoverProvider: true,
      documentSymbolProvider: true,
      referencesProvider: true,
      definitionProvider: true,
      documentHighlightProvider: true,
      codeActionProvider: true,
      renameProvider: true,
    },
  };
});

const languageServices: { [id: string]: LanguageService } = {
  css: getPostCSSLanguageService(),
};

function getLanguageService(document: TextDocument) {
  const service = languageServices['css'];
  return service;
}

// The settings have changed. Is send on server activation as well.
connection.onDidChangeConfiguration((change) => {
  updateConfiguration(<Settings>change.settings);
});

function updateConfiguration(settings: Settings) {
  settings['css'] = settings['postcss'];
  for (const languageId in languageServices) {
    languageServices[languageId].configure(settings[languageId]);
  }
  // Revalidate any open text documents
  documents.all().forEach(triggerValidation);
}

const pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
const validationDelayMs = 200;

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  triggerValidation(change.document);
});

// a document has closed: clear all diagnostics
documents.onDidClose((event) => {
  cleanPendingValidation(event.document);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

function cleanPendingValidation(textDocument: TextDocument): void {
  const request = pendingValidationRequests[textDocument.uri];
  if (request) {
    clearTimeout(request);
    delete pendingValidationRequests[textDocument.uri];
  }
}

function triggerValidation(textDocument: TextDocument): void {
  cleanPendingValidation(textDocument);
  pendingValidationRequests[textDocument.uri] = setTimeout(() => {
    delete pendingValidationRequests[textDocument.uri];
    validateTextDocument(textDocument);
  }, validationDelayMs);
}

function validateTextDocument(textDocument: TextDocument): void {
  const stylesheet = stylesheets.get(textDocument);
  const diagnostics = getLanguageService(textDocument).doValidation(
    textDocument,
    stylesheet
  );

  // fiter out postcss syntax errors with regex /Unknown at rule @custom-/
  // const filteredDiagnostics = diagnostics.filter(
  //   (diagnostic) =>
  //     !(
  //       diagnostic.message.match(/Unknown at rule @/) ||
  //       diagnostic.message.match(/Unknown property: '(composes)/)
  //     )
  // );

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({
    uri: textDocument.uri,
    diagnostics: diagnostics,
  });
}

connection.onCompletion((textDocumentPosition) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  const stylesheet = stylesheets.get(document);
  return getLanguageService(document).doComplete(
    document,
    textDocumentPosition.position,
    stylesheet
  );
});

connection.onHover((textDocumentPosition) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  const styleSheet = stylesheets.get(document);
  return getLanguageService(document).doHover(
    document,
    textDocumentPosition.position,
    styleSheet
  );
});

connection.onDocumentSymbol((documentSymbolParams) => {
  const document = documents.get(documentSymbolParams.textDocument.uri);
  const stylesheet = stylesheets.get(document);
  return getLanguageService(document).findDocumentSymbols(document, stylesheet);
});

connection.onDefinition((documentSymbolParams) => {
  const document = documents.get(documentSymbolParams.textDocument.uri);
  const stylesheet = stylesheets.get(document);
  return getLanguageService(document).findDefinition(
    document,
    documentSymbolParams.position,
    stylesheet
  );
});

connection.onDocumentHighlight((documentSymbolParams) => {
  const document = documents.get(documentSymbolParams.textDocument.uri);
  const stylesheet = stylesheets.get(document);
  return getLanguageService(document).findDocumentHighlights(
    document,
    documentSymbolParams.position,
    stylesheet
  );
});

connection.onReferences((referenceParams) => {
  const document = documents.get(referenceParams.textDocument.uri);
  const stylesheet = stylesheets.get(document);
  return getLanguageService(document).findReferences(
    document,
    referenceParams.position,
    stylesheet
  );
});

connection.onCodeAction((codeActionParams) => {
  const document = documents.get(codeActionParams.textDocument.uri);
  const stylesheet = stylesheets.get(document);
  return getLanguageService(document).doCodeActions(
    document,
    codeActionParams.range,
    codeActionParams.context,
    stylesheet
  );
});

connection.onDocumentSymbol((params) => {
  const document = documents.get(params.textDocument.uri);
  if (document) {
    const stylesheet = stylesheets.get(document);
    return getLanguageService(document).findDocumentSymbols(
      document,
      stylesheet
    );
  }
  return [];
});

connection.onRenameRequest((renameParameters) => {
  const document = documents.get(renameParameters.textDocument.uri);
  const stylesheet = stylesheets.get(document);
  return getLanguageService(document).doRename(
    document,
    renameParameters.position,
    renameParameters.newName,
    stylesheet
  );
});

// Listen on the connection
connection.listen();
