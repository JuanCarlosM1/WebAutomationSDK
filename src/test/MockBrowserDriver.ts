import { IBrowserDriver } from '../engine/ExecutionContext';

export interface DriverCall {
  method: string;
  args: any[];
}

export class MockBrowserDriver implements IBrowserDriver {
  public calls: DriverCall[] = [];
  public currentUrl: string = 'https://example.com';
  public elementsMap: Map<string, { exists: boolean; text?: string; html?: string; attr?: Record<string, string> }> = new Map();
  public tabs: Array<{ tabId: number; url?: string; active: boolean }> = [
    { tabId: 1, url: 'https://example.com', active: true },
  ];
  public downloadedFiles: Array<{ filename: string; content: string; mimeType: string }> = [];

  private record(method: string, ...args: any[]) {
    this.calls.push({ method, args });
  }

  // Navegação
  async navigateTo(url: string, waitUntil: string, timeoutMs?: number): Promise<void> {
    this.record('navigateTo', url, waitUntil, timeoutMs);
    this.currentUrl = url;
  }

  async createTab(url?: string, active?: boolean): Promise<{ tabId: number; url?: string }> {
    this.record('createTab', url, active);
    const newTab = { tabId: this.tabs.length + 1, url, active: active ?? true };
    this.tabs.push(newTab);
    return { tabId: newTab.tabId, url: newTab.url };
  }

  async switchTab(queryType: string, queryValue: string | number): Promise<void> {
    this.record('switchTab', queryType, queryValue);
  }

  async closeTab(queryType?: string, queryValue?: string | number): Promise<void> {
    this.record('closeTab', queryType, queryValue);
  }

  async getCurrentUrl(): Promise<string> {
    this.record('getCurrentUrl');
    return this.currentUrl;
  }

  async navigateHistory(action: 'back' | 'forward' | 'reload', ignoreCache?: boolean): Promise<void> {
    this.record('navigateHistory', action, ignoreCache);
  }

  // DOM
  async clickElement(selector: string, selectorType: 'css' | 'xpath', clickType: string, timeoutMs?: number, coordinates?: { x: number; y: number }): Promise<void> {
    this.record('clickElement', selector, selectorType, clickType, timeoutMs, coordinates);
  }

  async typeText(selector: string, selectorType: 'css' | 'xpath', text: string, mode: string, minDelay?: number, maxDelay?: number, clear?: boolean, pressEnter?: boolean, timeoutMs?: number): Promise<void> {
    this.record('typeText', selector, selectorType, text, mode, minDelay, maxDelay, clear, pressEnter, timeoutMs);
  }

  async pressKey(key: string, modifiers?: string[], selector?: string, selectorType?: 'css' | 'xpath'): Promise<void> {
    this.record('pressKey', key, modifiers, selector, selectorType);
  }

  async hoverOrFocus(selector: string, selectorType: 'css' | 'xpath', action: 'hover' | 'focus', timeoutMs?: number): Promise<void> {
    this.record('hoverOrFocus', selector, selectorType, action, timeoutMs);
  }

  async scroll(target: string, selector?: string, selectorType?: 'css' | 'xpath', deltaX?: number, deltaY?: number, smooth?: boolean): Promise<void> {
    this.record('scroll', target, selector, selectorType, deltaX, deltaY, smooth);
  }

  async waitForElement(selector: string, selectorType: 'css' | 'xpath', state: string, timeoutMs: number): Promise<boolean> {
    this.record('waitForElement', selector, selectorType, state, timeoutMs);
    return true;
  }

  async elementExists(selector: string, selectorType: 'css' | 'xpath', timeoutMs?: number): Promise<boolean> {
    this.record('elementExists', selector, selectorType, timeoutMs);
    const item = this.elementsMap.get(selector);
    return item ? item.exists : false;
  }

  // Extração e Injeção
  async extractData(selector: string, selectorType: 'css' | 'xpath', extractType: string, attributeName?: string, timeoutMs?: number): Promise<any> {
    this.record('extractData', selector, selectorType, extractType, attributeName, timeoutMs);
    const item = this.elementsMap.get(selector);
    if (!item) return '';
    if (extractType === 'innerText' || extractType === 'value') return item.text ?? '';
    if (extractType === 'innerHTML') return item.html ?? '';
    if (extractType === 'attribute' && attributeName) return item.attr?.[attributeName] ?? '';
    return item.text ?? '';
  }

  async scrapeList(selector: string, selectorType: 'css' | 'xpath', fields: any[], maxItems?: number, timeoutMs?: number): Promise<any[]> {
    this.record('scrapeList', selector, selectorType, fields, maxItems, timeoutMs);
    return [
      { titulo: 'Item 1', link: 'https://example.com/1' },
      { titulo: 'Item 2', link: 'https://example.com/2' },
    ];
  }

  async injectScript(code: string, context: 'content_script' | 'background', args?: any[]): Promise<any> {
    this.record('injectScript', code, context, args);
    return { executed: true, argsCount: (args || []).length };
  }

  async injectHtml(html: string, targetSelector: string, position: string, selectorType?: 'css' | 'xpath'): Promise<void> {
    this.record('injectHtml', html, targetSelector, position, selectorType);
  }

  async injectCss(css: string, target: 'page' | 'injected_component', styleId?: string): Promise<void> {
    this.record('injectCss', css, target, styleId);
  }

  async injectWebComponent(html: string, css: string, js: string, containerId: string, mode: 'shadow_dom' | 'inline'): Promise<void> {
    this.record('injectWebComponent', html, css, js, containerId, mode);
  }

  // Utilitários
  async downloadFile(content: string, filename: string, mimeType: string): Promise<void> {
    this.record('downloadFile', content, filename, mimeType);
    this.downloadedFiles.push({ filename, content, mimeType });
  }
}
