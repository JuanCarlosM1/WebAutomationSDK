/**
 * Tipos e interfaces de contexto e controle de execução
 */

import { AnyAutomationNode, AutomationEdge, NodeType, WebAutomationGraph } from '../types/schema';
import { StateManager } from './StateManager';

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface NodeExecutionResult {
  nodeId: string;
  status: 'success' | 'failed' | 'skipped';
  outputHandle?: string; // Qual porta de saída seguir (ex: 'true', 'false', 'default', case id)
  outputData?: any;
  error?: Error;
  startTime: number;
  endTime: number;
  durationMs: number;
}

export interface ExecutionLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
  payload?: any;
}

export interface ExecutionEvents {
  onStatusChange?: (status: ExecutionStatus) => void;
  onNodeStart?: (node: AnyAutomationNode) => void;
  onNodeComplete?: (node: AnyAutomationNode, result: NodeExecutionResult) => void;
  onNodeError?: (node: AnyAutomationNode, error: Error) => void;
  onVariableChange?: (key: string, value: any) => void;
  onLog?: (log: ExecutionLog) => void;
}

/**
 * Driver abstrato para comunicação com o navegador (Browser API & DOM Driver)
 * Permite que o mesmo motor funcione tanto na Extensão de Browser quanto em ambiente de testes/SDK.
 */
export interface IBrowserDriver {
  // Navegação
  navigateTo(url: string, waitUntil: string, timeoutMs?: number): Promise<void>;
  createTab(url?: string, active?: boolean): Promise<{ tabId: number; url?: string }>;
  switchTab(queryType: string, queryValue: string | number): Promise<void>;
  closeTab(queryType?: string, queryValue?: string | number): Promise<void>;
  getCurrentUrl(): Promise<string>;
  navigateHistory(action: 'back' | 'forward' | 'reload', ignoreCache?: boolean): Promise<void>;

  // DOM
  clickElement(selector: string, selectorType: 'css' | 'xpath', clickType: string, timeoutMs?: number, coordinates?: { x: number; y: number }): Promise<void>;
  typeText(selector: string, selectorType: 'css' | 'xpath', text: string, mode: string, minDelay?: number, maxDelay?: number, clear?: boolean, pressEnter?: boolean, timeoutMs?: number): Promise<void>;
  pressKey(key: string, modifiers?: string[], selector?: string, selectorType?: 'css' | 'xpath'): Promise<void>;
  hoverOrFocus(selector: string, selectorType: 'css' | 'xpath', action: 'hover' | 'focus', timeoutMs?: number): Promise<void>;
  scroll(target: string, selector?: string, selectorType?: 'css' | 'xpath', deltaX?: number, deltaY?: number, smooth?: boolean): Promise<void>;
  waitForElement(selector: string, selectorType: 'css' | 'xpath', state: string, timeoutMs: number): Promise<boolean>;
  elementExists(selector: string, selectorType: 'css' | 'xpath', timeoutMs?: number): Promise<boolean>;
  
  // Extração e Injeção
  extractData(selector: string, selectorType: 'css' | 'xpath', extractType: string, attributeName?: string, timeoutMs?: number): Promise<any>;
  scrapeList(selector: string, selectorType: 'css' | 'xpath', fields: any[], maxItems?: number, timeoutMs?: number): Promise<any[]>;
  injectScript(code: string, context: 'content_script' | 'background', args?: any[]): Promise<any>;
  injectHtml(html: string, targetSelector: string, position: string, selectorType?: 'css' | 'xpath'): Promise<void>;
  injectCss(css: string, target: 'page' | 'injected_component', styleId?: string): Promise<void>;
  injectWebComponent(html: string, css: string, js: string, containerId: string, mode: 'shadow_dom' | 'inline'): Promise<void>;
  
  // Utilitários
  downloadFile(content: string, filename: string, mimeType: string): Promise<void>;
}

export class ExecutionContext {
  public state: StateManager;
  public driver: IBrowserDriver;
  public status: ExecutionStatus = 'idle';
  public logs: ExecutionLog[] = [];
  public nodeResults: Map<string, NodeExecutionResult> = new Map();
  public events: ExecutionEvents;
  private isCancellationRequested = false;
  private isPauseRequested = false;
  private pauseResolver?: () => void;

  constructor(
    initialVariables: Record<string, any> = {},
    driver: IBrowserDriver,
    events: ExecutionEvents = {}
  ) {
    this.state = new StateManager(initialVariables);
    this.driver = driver;
    this.events = events;
  }

  public log(level: 'debug' | 'info' | 'warn' | 'error', message: string, nodeId?: string, payload?: any): void {
    const logItem: ExecutionLog = {
      timestamp: Date.now(),
      level,
      nodeId,
      message,
      payload,
    };
    this.logs.push(logItem);
    this.events.onLog?.(logItem);
  }

  public setStatus(status: ExecutionStatus): void {
    this.status = status;
    this.events.onStatusChange?.(status);
  }

  public requestCancel(): void {
    this.isCancellationRequested = true;
    if (this.pauseResolver) {
      this.pauseResolver();
    }
  }

  public requestPause(): void {
    this.isPauseRequested = true;
  }

  public resume(): void {
    this.isPauseRequested = false;
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = undefined;
    }
  }

  public isCancelled(): boolean {
    return this.isCancellationRequested;
  }

  public async checkPausePoint(): Promise<void> {
    if (this.isPauseRequested && !this.isCancellationRequested) {
      this.setStatus('paused');
      await new Promise<void>((resolve) => {
        this.pauseResolver = resolve;
      });
      if (!this.isCancellationRequested) {
        this.setStatus('running');
      }
    }
  }
}

/**
 * Interface que cada Handler de Nó deve implementar
 */
export interface INodeHandler<T extends NodeType = NodeType> {
  execute(
    node: AnyAutomationNode & { type: T },
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
}
