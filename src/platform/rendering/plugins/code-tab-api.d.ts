import type { Component } from "obsidian";

export interface CodeTabData {
  readonly title: string;
  readonly content: string;
}

export interface CodeTabRenderOptions {
  container: HTMLElement;
  component: Component;
  id: string;
  source: string;
  sourcePath: string;
  readOnly?: boolean;
  onChange?: (expected: string, next: string | null) => Promise<void>;
  onEditingChange?: (editing: boolean) => void;
}

export interface CodeTabUpdate {
  source?: string;
  sourcePath?: string;
  readOnly?: boolean;
}

export interface CodeTabSnapshot {
  readonly source: string;
  readonly revision: number;
  readonly tabs: readonly CodeTabData[];
  readonly activeIndex: number | null;
  readonly readOnly: boolean;
  readonly editing: boolean;
  readonly saving: boolean;
  readonly rendering: boolean;
}

export type CodeTabOperation =
  | { type: "insert-tab"; index: number; tab: CodeTabData }
  | { type: "replace-tab"; index: number; tab: CodeTabData }
  | { type: "remove-tab"; index: number }
  | { type: "move-tab"; fromIndex: number; toIndex: number };

export interface CodeTabApplyOptions {
  expectedRevision: number;
}

export interface CodeTabHandle {
  update(patch: CodeTabUpdate): Promise<void>;
  getSnapshot(): CodeTabSnapshot;
  apply(operations: readonly CodeTabOperation[], options: CodeTabApplyOptions): Promise<void>;
  selectTab(index: number): void;
  focus(target?: "tab" | "content" | "editor"): void;
  startEditing(index?: number): void;
  commit(): Promise<void>;
  cancel(): Promise<void>;
  subscribe(listener: (snapshot: CodeTabSnapshot) => void): () => void;
  dispose(): void;
}

export interface CodeTabApi {
  readonly errorCodes: Readonly<typeof CodeTabErrorCode>;
  readonly completion: CompletionEngine;
  readonly capabilities: readonly string[];
  parse(source: string): readonly CodeTabData[];
  serialize(tabs: readonly CodeTabData[]): string;
  render(options: CodeTabRenderOptions): Promise<CodeTabHandle>;
}

export interface CodeTabApiRequest {
  api?: CodeTabApi;
}


export interface CompletionWordEntry {
  readonly label: string;
  readonly insertText?: string;
  readonly detail?: string;
  readonly boost?: number;
}

export type CompletionWord = string | CompletionWordEntry;

export interface CompletionContext {
  readonly documentId: string;
  readonly revision: number;
  readonly text: string;
  readonly offset: number;
  readonly language: string;
  readonly trigger: "automatic" | "explicit";
  readonly signal?: AbortSignal;
}

export interface CompletionItem {
  readonly label: string;
  readonly insertText: string;
  readonly from: number;
  readonly to: number;
  readonly detail?: string;
  readonly boost?: number;
}

export interface CompletionResult {
  readonly documentId: string;
  readonly revision: number;
  readonly registryRevision: number;
  readonly offset: number;
  readonly language: string;
  readonly items: readonly CompletionItem[];
  readonly failures: readonly CompletionFailure[];
}

export interface CompletionFailure {
  readonly ruleId: string;
  readonly message: string;
}

export interface CompletionWordList {
  readonly id: string;
  readonly languages: readonly string[];
  readonly words: readonly CompletionWord[];
}

export interface CompletionRule {
  readonly id: string;
  readonly languages: readonly string[];
  readonly match?: RegExp;
  readonly words?: readonly CompletionWord[];
  readonly complete?: (
    context: CompletionContext,
  ) => readonly CompletionItem[] | Promise<readonly CompletionItem[]>;
}

export interface CompletionRuleConfig extends CompletionWordList {
  readonly match?: string;
  readonly flags?: string;
}

export interface CompletionConfiguration {
  readonly wordLists: readonly CompletionWordList[];
  readonly rules: readonly CompletionRuleConfig[];
}

export interface CompletionRegistration {
  readonly id: string;
  readonly languages: readonly string[];
  readonly kind: "words" | "rule";
}

export interface CompletionEngine {
  readonly errorCodes: Readonly<typeof CompletionErrorCode>;
  readonly languages: readonly string[];
  complete(context: CompletionContext): Promise<CompletionResult>;
  registerWords(list: CompletionWordList): () => void;
  replaceWords(list: CompletionWordList): () => void;
  registerRule(rule: CompletionRule): () => void;
  replaceRule(rule: CompletionRule): () => void;
  unregister(id: string): boolean;
  list(): readonly CompletionRegistration[];
  configure(configuration: CompletionConfiguration): void;
  getRevision(): number;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

/** 对外错误码使用独立枚举，序列化值保持稳定。 */
export enum CodeTabErrorCode {
  InvalidOptions = "INVALID_OPTIONS",
  InvalidOperation = "INVALID_OPERATION",
  ContainerInUse = "CONTAINER_IN_USE",
  ReadOnly = "READ_ONLY",
  Busy = "BUSY",
  Disposed = "DISPOSED",
  RevisionMismatch = "REVISION_MISMATCH",
  CommitFailed = "COMMIT_FAILED",
  RenderFailed = "RENDER_FAILED",
}


/** 对外错误码使用独立枚举，序列化值保持稳定。 */
export enum CompletionErrorCode {
  InvalidContext = "INVALID_CONTEXT",
  InvalidRule = "INVALID_RULE",
  DuplicateId = "DUPLICATE_ID",
  NotFound = "NOT_FOUND",
  Cancelled = "CANCELLED",
  Stale = "STALE",
  Disposed = "DISPOSED",
}

