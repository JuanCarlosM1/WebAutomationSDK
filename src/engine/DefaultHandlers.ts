/**
 * Handlers Padrão de Execução para os Nós do Grafo
 */

import {
  DelayNodeData,
  HttpRequestNodeData,
  IfElementExistsNodeData,
  SetVariableNodeData,
  StartNodeData,
  SwitchNodeData,
  NodeType,
} from '../types/schema';
import {
  ExecutionContext,
  INodeHandler,
  NodeExecutionResult,
} from './ExecutionContext';
import { ExecutionEngine } from './ExecutionEngine';

/**
 * Helper para criar resultado de sucesso
 */
function successResult(nodeId: string, outputHandle?: string, outputData?: any): NodeExecutionResult {
  return {
    nodeId,
    status: 'success',
    outputHandle,
    outputData,
    startTime: 0,
    endTime: 0,
    durationMs: 0,
  };
}

// -------------------------------------------------------------
// A. CONTROLE DE FLUXO E LÓGICA
// -------------------------------------------------------------

export class StartNodeHandler implements INodeHandler<'start'> {
  async execute(node: { id: string; data: StartNodeData }, context: ExecutionContext): Promise<NodeExecutionResult> {
    context.log('info', `Gatilho acionado: ${node.data.triggerType}`, node.id);
    return successResult(node.id, 'default');
  }
}

export class DelayNodeHandler implements INodeHandler<'delay'> {
  async execute(node: { id: string; data: DelayNodeData }, context: ExecutionContext): Promise<NodeExecutionResult> {
    let delayMs = node.data.fixedMs ?? 1000;

    if (node.data.isRandom && node.data.randomRange) {
      const { minMs, maxMs } = node.data.randomRange;
      delayMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    }

    context.log('debug', `Aguardando delay de ${delayMs}ms...`, node.id);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    return successResult(node.id, 'default');
  }
}

export class SwitchNodeHandler implements INodeHandler<'switch'> {
  async execute(node: { id: string; data: SwitchNodeData }, context: ExecutionContext): Promise<NodeExecutionResult> {
    const { cases, hasDefaultBranch } = node.data;

    for (const testCase of cases) {
      let passed = false;

      if (testCase.evaluationMode === 'js_eval' || (testCase.jsExpression && !testCase.operator)) {
        const result = context.state.evaluateJsExpression(testCase.jsExpression || '');
        passed = Boolean(result);
      } else {
        passed = context.state.evaluateCondition(
          testCase.leftOperand,
          testCase.operator,
          testCase.rightOperand
        );
      }

      if (passed) {
        context.log('info', `Condição satisfeita para o caso [${testCase.label || testCase.id}]`, node.id);
        return successResult(node.id, testCase.id);
      }
    }

    if (hasDefaultBranch) {
      context.log('info', 'Nenhuma condição satisfeita. Seguindo caminho default.', node.id);
      return successResult(node.id, 'default');
    }

    return successResult(node.id, undefined);
  }
}

export class IfElementExistsNodeHandler implements INodeHandler<'if_element_exists'> {
  async execute(node: { id: string; data: IfElementExistsNodeData }, context: ExecutionContext): Promise<NodeExecutionResult> {
    const { selector, selectorType, timeoutMs } = node.data;
    const interpolatedSelector = context.state.interpolate(selector);

    context.log('debug', `Verificando existência do elemento: ${interpolatedSelector}`, node.id);
    const exists = await context.driver.elementExists(interpolatedSelector, selectorType, timeoutMs);

    const branch = exists ? 'true' : 'false';
    context.log('info', `Elemento ${exists ? 'encontrado' : 'não encontrado'}. Seguindo caminho: ${branch}`, node.id);

    return successResult(node.id, branch, { exists });
  }
}

// -------------------------------------------------------------
// B. NAVEGAÇÃO
// -------------------------------------------------------------

export class NavigateNodeHandler implements INodeHandler<'navigate'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const url = context.state.interpolate(node.data.url);
    context.log('info', `Navegando para URL: ${url}`, node.id);
    await context.driver.navigateTo(url, node.data.waitUntil, node.data.timeoutMs);
    return successResult(node.id, 'default');
  }
}

export class TabActionNodeHandler implements INodeHandler<'tab_action'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const { action, queryType, queryValue, saveUrlToVar, active } = node.data;

    switch (action) {
      case 'new_tab': {
        const targetUrl = node.data.url ? context.state.interpolate(node.data.url) : undefined;
        const res = await context.driver.createTab(targetUrl, active);
        if (saveUrlToVar && res.url) context.state.set(saveUrlToVar, res.url);
        break;
      }
      case 'switch_tab': {
        const val = typeof queryValue === 'string' ? context.state.interpolate(queryValue) : queryValue;
        await context.driver.switchTab(queryType, val);
        break;
      }
      case 'close_tab': {
        const val = typeof queryValue === 'string' ? context.state.interpolate(queryValue) : queryValue;
        await context.driver.closeTab(queryType, val);
        break;
      }
      case 'get_current_url': {
        const currentUrl = await context.driver.getCurrentUrl();
        if (saveUrlToVar) context.state.set(saveUrlToVar, currentUrl);
        break;
      }
    }

    return successResult(node.id, 'default');
  }
}

export class HistoryNavigationNodeHandler implements INodeHandler<'history_navigation'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    await context.driver.navigateHistory(node.data.action, node.data.ignoreCache);
    return successResult(node.id, 'default');
  }
}

// -------------------------------------------------------------
// C. INTERAÇÃO COM A PÁGINA (DOM)
// -------------------------------------------------------------

export class ClickElementNodeHandler implements INodeHandler<'click_element'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const selector = context.state.interpolate(node.data.selector);
    await context.driver.clickElement(
      selector,
      node.data.selectorType,
      node.data.clickType,
      node.data.timeoutMs,
      node.data.clickCoordinates
    );
    return successResult(node.id, 'default');
  }
}

export class TypeInputNodeHandler implements INodeHandler<'type_input'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const selector = context.state.interpolate(node.data.selector);
    const text = context.state.interpolate(node.data.text);

    await context.driver.typeText(
      selector,
      node.data.selectorType,
      text,
      node.data.mode,
      node.data.minTypingDelayMs,
      node.data.maxTypingDelayMs,
      node.data.clearBeforeTyping,
      node.data.pressEnterAfter,
      node.data.timeoutMs
    );
    return successResult(node.id, 'default');
  }
}

export class PressKeyNodeHandler implements INodeHandler<'press_key'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const selector = node.data.selector ? context.state.interpolate(node.data.selector) : undefined;
    await context.driver.pressKey(node.data.key, node.data.modifiers, selector, node.data.selectorType);
    return successResult(node.id, 'default');
  }
}

export class HoverFocusNodeHandler implements INodeHandler<'hover_focus'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const selector = context.state.interpolate(node.data.selector);
    await context.driver.hoverOrFocus(selector, node.data.selectorType, node.data.action, node.data.timeoutMs);
    return successResult(node.id, 'default');
  }
}

export class ScrollNodeHandler implements INodeHandler<'scroll'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const selector = node.data.selector ? context.state.interpolate(node.data.selector) : undefined;
    await context.driver.scroll(
      node.data.target,
      selector,
      node.data.selectorType,
      node.data.deltaX,
      node.data.deltaY,
      node.data.smooth
    );
    return successResult(node.id, 'default');
  }
}

export class WaitForElementNodeHandler implements INodeHandler<'wait_for_element'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const selector = context.state.interpolate(node.data.selector);
    await context.driver.waitForElement(selector, node.data.selectorType, node.data.state, node.data.timeoutMs);
    return successResult(node.id, 'default');
  }
}

// -------------------------------------------------------------
// D. DADOS, VARIÁVEIS E REDE
// -------------------------------------------------------------

export class SetVariableNodeHandler implements INodeHandler<'set_variable'> {
  async execute(node: { id: string; data: SetVariableNodeData }, context: ExecutionContext): Promise<NodeExecutionResult> {
    const { varName, evaluationType, valueExpression } = node.data;
    let finalValue: any;

    if (evaluationType === 'literal') {
      finalValue = valueExpression;
    } else if (evaluationType === 'template') {
      finalValue = context.state.interpolate(String(valueExpression));
    } else if (evaluationType === 'js_eval') {
      const interpolatedCode = context.state.interpolate(String(valueExpression));
      // Avaliação segura no contexto das variáveis
      const vars = context.state.getAll();
      const fn = new Function(...Object.keys(vars), `return (${interpolatedCode});`);
      finalValue = fn(...Object.values(vars));
    }

    context.state.set(varName, finalValue);
    context.events.onVariableChange?.(varName, finalValue);
    context.log('info', `Variável [${varName}] definida com valor: ${JSON.stringify(finalValue)}`, node.id);

    return successResult(node.id, 'default', { [varName]: finalValue });
  }
}

export class HttpRequestNodeHandler implements INodeHandler<'http_request'> {
  async execute(node: { id: string; data: HttpRequestNodeData }, context: ExecutionContext): Promise<NodeExecutionResult> {
    const { url, method, headers, body, responseType, saveResponseToVar, saveStatusToVar } = node.data;
    const resolvedUrl = context.state.interpolate(url);

    const resolvedHeaders: Record<string, string> = {};
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        resolvedHeaders[k] = context.state.interpolate(v);
      }
    }

    const resolvedBody = body ? context.state.interpolate(body) : undefined;

    context.log('info', `Executando requisição HTTP ${method} para ${resolvedUrl}`, node.id);

    const response = await fetch(resolvedUrl, {
      method,
      headers: resolvedHeaders,
      body: method !== 'GET' && method !== 'HEAD' ? resolvedBody : undefined,
    });

    let data: any;
    if (responseType === 'text') {
      data = await response.text();
    } else {
      data = await response.json();
    }

    context.state.set(saveResponseToVar, data);
    if (saveStatusToVar) {
      context.state.set(saveStatusToVar, response.status);
    }

    return successResult(node.id, 'default', { response: data, status: response.status });
  }
}

export class ExtractDataNodeHandler implements INodeHandler<'extract_data'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const selector = context.state.interpolate(node.data.selector);
    const data = await context.driver.extractData(
      selector,
      node.data.selectorType,
      node.data.extractType,
      node.data.attributeName,
      node.data.timeoutMs
    );

    context.state.set(node.data.saveToVar, data);
    context.log('info', `Dado extraído salvo em [${node.data.saveToVar}]`, node.id);
    return successResult(node.id, 'default', { [node.data.saveToVar]: data });
  }
}

export class ScrapeListNodeHandler implements INodeHandler<'scrape_list'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const selector = context.state.interpolate(node.data.selector);
    const items = await context.driver.scrapeList(
      selector,
      node.data.selectorType,
      node.data.fields,
      node.data.maxItems,
      node.data.timeoutMs
    );

    context.state.set(node.data.saveToVar, items);
    context.log('info', `Lista raspada (${items.length} itens) salva em [${node.data.saveToVar}]`, node.id);
    return successResult(node.id, 'default', { [node.data.saveToVar]: items });
  }
}

export class ExportFileNodeHandler implements INodeHandler<'export_file'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const rawData = context.state.get(node.data.sourceVar);
    const filename = context.state.interpolate(node.data.filename);
    let content = '';
    let mimeType = 'text/plain';

    if (node.data.format === 'json') {
      content = JSON.stringify(rawData, null, 2);
      mimeType = 'application/json';
    } else if (node.data.format === 'csv') {
      mimeType = 'text/csv';
      const delimiter = node.data.csvDelimiter || ',';
      if (Array.isArray(rawData) && rawData.length > 0) {
        const headers = Object.keys(rawData[0]);
        const headerRow = headers.join(delimiter);
        const rows = rawData.map((item) =>
          headers.map((h) => JSON.stringify(item[h] ?? '')).join(delimiter)
        );
        content = [headerRow, ...rows].join('\n');
      }
    }

    await context.driver.downloadFile(content, filename, mimeType);
    context.log('info', `Arquivo ${filename} exportado com sucesso.`, node.id);
    return successResult(node.id, 'default');
  }
}

// -------------------------------------------------------------
// E. INJEÇÃO E CUSTOMIZAÇÃO
// -------------------------------------------------------------

export class InjectJavascriptNodeHandler implements INodeHandler<'inject_javascript'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const code = context.state.interpolate(node.data.code);
    const args = (node.data.args || []).map((arg: string) => context.state.get(arg));
    const result = await context.driver.injectScript(code, node.data.context, args);

    if (node.data.saveResultToVar) {
      context.state.set(node.data.saveResultToVar, result);
    }
    return successResult(node.id, 'default', { result });
  }
}

export class InjectHtmlNodeHandler implements INodeHandler<'inject_html'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const html = context.state.interpolate(node.data.html);
    const selector = context.state.interpolate(node.data.targetSelector);
    await context.driver.injectHtml(html, selector, node.data.position, node.data.selectorType);
    return successResult(node.id, 'default');
  }
}

export class InjectCssNodeHandler implements INodeHandler<'inject_css'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const css = context.state.interpolate(node.data.css);
    await context.driver.injectCss(css, node.data.target, node.data.styleId);
    return successResult(node.id, 'default');
  }
}

export class WebComponentNodeHandler implements INodeHandler<'web_component'> {
  async execute(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    const html = context.state.interpolate(node.data.html);
    const css = context.state.interpolate(node.data.css);
    const js = context.state.interpolate(node.data.js);
    await context.driver.injectWebComponent(html, css, js, node.data.containerId, node.data.mode);
    return successResult(node.id, 'default');
  }
}

/**
 * Função utilitária para registrar todos os handlers padrão no motor
 */
export function registerAllDefaultHandlers(engine: ExecutionEngine): void {
  engine.registerHandler('start', new StartNodeHandler());
  engine.registerHandler('delay', new DelayNodeHandler());
  engine.registerHandler('switch', new SwitchNodeHandler());
  engine.registerHandler('if_element_exists', new IfElementExistsNodeHandler());
  engine.registerHandler('navigate', new NavigateNodeHandler());
  engine.registerHandler('tab_action', new TabActionNodeHandler());
  engine.registerHandler('history_navigation', new HistoryNavigationNodeHandler());
  engine.registerHandler('click_element', new ClickElementNodeHandler());
  engine.registerHandler('type_input', new TypeInputNodeHandler());
  engine.registerHandler('press_key', new PressKeyNodeHandler());
  engine.registerHandler('hover_focus', new HoverFocusNodeHandler());
  engine.registerHandler('scroll', new ScrollNodeHandler());
  engine.registerHandler('wait_for_element', new WaitForElementNodeHandler());
  engine.registerHandler('set_variable', new SetVariableNodeHandler());
  engine.registerHandler('http_request', new HttpRequestNodeHandler());
  engine.registerHandler('extract_data', new ExtractDataNodeHandler());
  engine.registerHandler('scrape_list', new ScrapeListNodeHandler());
  engine.registerHandler('export_file', new ExportFileNodeHandler());
  engine.registerHandler('inject_javascript', new InjectJavascriptNodeHandler());
  engine.registerHandler('inject_html', new InjectHtmlNodeHandler());
  engine.registerHandler('inject_css', new InjectCssNodeHandler());
  engine.registerHandler('web_component', new WebComponentNodeHandler());
}
