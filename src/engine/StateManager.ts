/**
 * Gerenciador de Estado em tempo de execução
 * Controla armazenamento, escopos locais e interpolação de variáveis.
 */

import { SwitchOperator } from '../types/schema';

export class StateManager {
  private variables: Map<string, any> = new Map();
  private localScopes: Map<string, any>[] = [];

  constructor(initialVariables: Record<string, any> = {}) {
    this.reset(initialVariables);
  }

  /**
   * Reseta o estado para os valores iniciais
   */
  public reset(initialVariables: Record<string, any> = {}): void {
    this.variables.clear();
    this.localScopes = [];
    for (const [key, value] of Object.entries(initialVariables)) {
      this.variables.set(key, value);
    }
  }

  /**
   * Define o valor de uma variável no escopo atual
   */
  public set(key: string, value: any): void {
    if (this.localScopes.length > 0) {
      const currentScope = this.localScopes[this.localScopes.length - 1];
      if (currentScope.has(key)) {
        currentScope.set(key, value);
        return;
      }
    }
    this.variables.set(key, value);
  }

  /**
   * Obtém o valor de uma variável (busca do escopo mais interno para o global)
   */
  public get(key: string): any {
    for (let i = this.localScopes.length - 1; i >= 0; i--) {
      if (this.localScopes[i].has(key)) {
        return this.localScopes[i].get(key);
      }
    }
    return this.variables.get(key);
  }

  /**
   * Retorna um snapshot de todas as variáveis acessíveis
   */
  public getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of this.variables.entries()) {
      result[k] = v;
    }
    for (const scope of this.localScopes) {
      for (const [k, v] of scope.entries()) {
        result[k] = v;
      }
    }
    return result;
  }

  /**
   * Empilha um novo escopo de bloco (ex: corpo de loop)
   */
  public pushScope(initialScopeVars: Record<string, any> = {}): void {
    const scope = new Map<string, any>();
    for (const [k, v] of Object.entries(initialScopeVars)) {
      scope.set(k, v);
    }
    this.localScopes.push(scope);
  }

  /**
   * Desempilha o escopo de bloco mais recente
   */
  public popScope(): void {
    if (this.localScopes.length > 0) {
      this.localScopes.pop();
    }
  }

  /**
   * Interpola strings com placeholders no formato {{variavel}} ou {{objeto.campo[0]}}
   */
  public interpolate(template: string): string {
    if (typeof template !== 'string') return template;

    return template.replace(/\{\{\s*([a-zA-Z0-9_$.[\]]+)\s*\}\}/g, (_, expression) => {
      const val = this.resolvePath(expression.trim());
      if (val === undefined || val === null) {
        return '';
      }
      if (typeof val === 'object') {
        return JSON.stringify(val);
      }
      return String(val);
    });
  }

  /**
   * Resolve caminhos de propriedades aninhadas, ex: "user.profile.name" ou "items[0].id"
   */
  public resolvePath(path: string): any {
    const parts = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
    let current = this.get(parts[0]);

    for (let i = 1; i < parts.length; i++) {
      if (current === undefined || current === null) return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  /**
   * Avalia uma expressão ou script JS arbitrário no escopo atual das variáveis
   */
  public evaluateJsExpression(expressionOrCode: string): any {
    if (!expressionOrCode || !expressionOrCode.trim()) return false;
    const interpolated = this.interpolate(expressionOrCode.trim());
    const vars = this.getAll();
    try {
      // Se contiver múltiplos comandos ou 'return', executa como corpo de função
      if (interpolated.includes(';') || interpolated.includes('return ') || interpolated.includes('\n')) {
        const fn = new Function(...Object.keys(vars), interpolated.includes('return ') ? interpolated : `return (${interpolated});`);
        return fn(...Object.values(vars));
      }
      const fn = new Function(...Object.keys(vars), `return (${interpolated});`);
      return fn(...Object.values(vars));
    } catch (err: any) {
      console.warn(`[StateManager] Erro ao avaliar expressão JS: "${interpolated}":`, err.message);
      return false;
    }
  }

  /**
   * Avalia uma condição com operadores lógicos do Switch/While
   */
  public evaluateCondition(leftRaw?: string, operator?: SwitchOperator, rightRaw?: string): boolean {
    const leftResolved = leftRaw !== undefined ? this.interpolate(leftRaw) : '';
    const rightResolved = rightRaw !== undefined ? this.interpolate(rightRaw) : undefined;

    switch (operator) {
      case 'equals':
        return String(leftResolved) === String(rightResolved);
      case 'not_equals':
        return String(leftResolved) !== String(rightResolved);
      case 'contains':
        return String(leftResolved).includes(String(rightResolved));
      case 'not_contains':
        return !String(leftResolved).includes(String(rightResolved));
      case 'greater_than':
        return Number(leftResolved) > Number(rightResolved);
      case 'less_than':
        return Number(leftResolved) < Number(rightResolved);
      case 'greater_or_equal':
        return Number(leftResolved) >= Number(rightResolved);
      case 'less_or_equal':
        return Number(leftResolved) <= Number(rightResolved);
      case 'is_empty':
        return leftResolved === '' || leftResolved === null || leftResolved === undefined;
      case 'is_not_empty':
        return leftResolved !== '' && leftResolved !== null && leftResolved !== undefined;
      case 'regex_match':
        if (!rightResolved) return false;
        try {
          const regex = new RegExp(rightResolved);
          return regex.test(String(leftResolved));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }
}

