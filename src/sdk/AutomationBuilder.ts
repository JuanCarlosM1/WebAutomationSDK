/**
 * WebAutomations SDK - Builder Pattern
 * Permite a criação de fluxos de automação via código com compilação para .webautomation.json
 */

import {
  AnyAutomationNode,
  AutomationEdge,
  AutomationMetadata,
  AutomationSettings,
  NodeType,
  Position,
  WebAutomationGraph,
} from '../types/schema';

export class AutomationBuilder {
  private metadata: AutomationMetadata;
  private settings: AutomationSettings = {
    stopOnError: true,
    defaultTimeoutMs: 10000,
    logLevel: 'info',
    parallelBranchesEnabled: false,
  };
  private variables: Record<string, any> = {};
  private nodes: AnyAutomationNode[] = [];
  private edges: AutomationEdge[] = [];
  private lastNodeId?: string;
  private currentY: number = 100;
  private defaultStepX: number = 250;

  constructor(name: string, description?: string) {
    this.metadata = {
      id: this.generateId('auto'),
      name,
      description,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
  }

  public setVariables(vars: Record<string, any>): this {
    this.variables = { ...this.variables, ...vars };
    return this;
  }

  public setSettings(settings: Partial<AutomationSettings>): this {
    this.settings = { ...this.settings, ...settings };
    return this;
  }

  public start(triggerType: 'manual' | 'on_url_load' | 'shortcut' | 'mcp' = 'manual', options?: { urlPattern?: string; shortcutKey?: string }): this {
    const id = this.generateId('start');
    const node: AnyAutomationNode = {
      id,
      type: 'start',
      category: 'flow_logic',
      position: { x: 100, y: this.currentY },
      data: {
        triggerType,
        ...options,
      },
    };

    this.nodes.push(node);
    this.lastNodeId = id;
    return this;
  }

  public delay(ms: number | { minMs: number; maxMs: number }): this {
    const id = this.generateId('delay');
    const isRandom = typeof ms !== 'number';

    const node: AnyAutomationNode = {
      id,
      type: 'delay',
      category: 'flow_logic',
      position: { x: this.getNextX(), y: this.currentY },
      data: {
        isRandom,
        fixedMs: !isRandom ? (ms as number) : undefined,
        randomRange: isRandom ? (ms as { minMs: number; maxMs: number }) : undefined,
      },
    };

    this.addNodeAndConnect(node);
    return this;
  }

  public navigate(url: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load', timeoutMs?: number): this {
    const id = this.generateId('nav');
    const node: AnyAutomationNode = {
      id,
      type: 'navigate',
      category: 'browser_navigation',
      position: { x: this.getNextX(), y: this.currentY },
      data: {
        url,
        waitUntil,
        timeoutMs,
      },
    };

    this.addNodeAndConnect(node);
    return this;
  }

  public click(selector: string, selectorType: 'css' | 'xpath' = 'css', clickType: 'single' | 'double' | 'contextmenu' = 'single'): this {
    const id = this.generateId('click');
    const node: AnyAutomationNode = {
      id,
      type: 'click_element',
      category: 'dom_interaction',
      position: { x: this.getNextX(), y: this.currentY },
      data: {
        selector,
        selectorType,
        clickType,
      },
    };

    this.addNodeAndConnect(node);
    return this;
  }

  public typeText(selector: string, text: string, mode: 'human_typing' | 'paste' = 'human_typing'): this {
    const id = this.generateId('type');
    const node: AnyAutomationNode = {
      id,
      type: 'type_input',
      category: 'dom_interaction',
      position: { x: this.getNextX(), y: this.currentY },
      data: {
        selector,
        selectorType: 'css',
        text,
        mode,
      },
    };

    this.addNodeAndConnect(node);
    return this;
  }

  public extractData(selector: string, extractType: 'innerText' | 'innerHTML' | 'attribute' | 'value', saveToVar: string, attributeName?: string): this {
    const id = this.generateId('extract');
    const node: AnyAutomationNode = {
      id,
      type: 'extract_data',
      category: 'data_network',
      position: { x: this.getNextX(), y: this.currentY },
      data: {
        selector,
        selectorType: 'css',
        extractType,
        attributeName,
        saveToVar,
      },
    };

    this.addNodeAndConnect(node);
    return this;
  }

  public setVariable(varName: string, valueExpression: any, evaluationType: 'literal' | 'template' | 'js_eval' = 'literal'): this {
    const id = this.generateId('set_var');
    const node: AnyAutomationNode = {
      id,
      type: 'set_variable',
      category: 'data_network',
      position: { x: this.getNextX(), y: this.currentY },
      data: {
        varName,
        evaluationType,
        valueExpression,
      },
    };

    this.addNodeAndConnect(node);
    return this;
  }

  private getNextX(): number {
    const lastNode = this.nodes.find((n) => n.id === this.lastNodeId);
    return lastNode ? lastNode.position.x + this.defaultStepX : 100;
  }

  private addNodeAndConnect(node: AnyAutomationNode, sourceHandle?: string): void {
    this.nodes.push(node);
    if (this.lastNodeId) {
      this.edges.push({
        id: `e_${this.lastNodeId}_${node.id}`,
        source: this.lastNodeId,
        target: node.id,
        sourceHandle,
      });
    }
    this.lastNodeId = node.id;
  }

  /**
   * Compila o fluxo para a estrutura de grafo .webautomation.json
   */
  public build(): WebAutomationGraph {
    return {
      schemaVersion: '1.0.0',
      metadata: this.metadata,
      settings: this.settings,
      variables: this.variables,
      nodes: this.nodes,
      edges: this.edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }

  /**
   * Compila e exporta como string JSON formatada
   */
  public toJSON(space: number = 2): string {
    return JSON.stringify(this.build(), null, space);
  }
}
