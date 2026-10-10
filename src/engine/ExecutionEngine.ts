/**
 * Motor Principal de Execução do Grafo (.webautomation.json)
 * Responsável pelo carregamento, validação, controle de loops, try/catch e travessia sequencial/paralela.
 */

import {
  AnyAutomationNode,
  AutomationEdge,
  ForLoopNodeData,
  NodeType,
  TryCatchNodeData,
  WebAutomationGraph,
  WhileLoopNodeData,
} from '../types/schema';
import {
  ExecutionContext,
  ExecutionEvents,
  IBrowserDriver,
  INodeHandler,
  NodeExecutionResult,
} from './ExecutionContext';

export class ExecutionEngine {
  private handlers: Map<NodeType, INodeHandler<any>> = new Map();

  /**
   * Registra um handler executor para um tipo de bloco
   */
  public registerHandler<T extends NodeType>(type: T, handler: INodeHandler<T>): void {
    this.handlers.set(type, handler);
  }

  /**
   * Executa um grafo completo de automação
   */
  public async runGraph(
    graph: WebAutomationGraph,
    driver: IBrowserDriver,
    events: ExecutionEvents = {},
    overrideVariables: Record<string, any> = {}
  ): Promise<ExecutionContext> {
    const initialVars = {
      ...graph.variables,
      ...overrideVariables,
    };

    const context = new ExecutionContext(initialVars, driver, events);
    context.setStatus('running');

    try {
      // 1. Encontrar o nó de partida (start)
      const startNode = this.findStartNode(graph);
      if (!startNode) {
        throw new Error('Nenhum nó de Início (start) válido foi encontrado no grafo.');
      }

      context.log('info', `Iniciando automação "${graph.metadata.name}" (v${graph.metadata.version})`);

      // 2. Iniciar a travessia a partir do nó Start
      await this.traverseNode(startNode, graph, context);

      if (context.isCancelled()) {
        context.setStatus('cancelled');
        context.log('warn', 'Execução da automação cancelada pelo usuário.');
      } else {
        context.setStatus('completed');
        context.log('info', 'Automação finalizada com sucesso!');
      }
    } catch (error: any) {
      context.setStatus('failed');
      context.log('error', `Falha crítica durante a execução: ${error?.message || error}`);
    }

    return context;
  }

  /**
   * Localiza o nó inicial ativo no grafo
   */
  private findStartNode(graph: WebAutomationGraph): AnyAutomationNode | undefined {
    return graph.nodes.find((n) => n.type === 'start' && !n.disabled);
  }

  /**
   * Processa a execução de um nó e continua a travessia
   */
  public async traverseNode(
    node: AnyAutomationNode,
    graph: WebAutomationGraph,
    context: ExecutionContext
  ): Promise<void> {
    if (context.isCancelled()) return;
    await context.checkPausePoint();

    // Nós ignorados na execução (apenas visuais)
    if (node.disabled || node.type === 'note' || node.type === 'group') {
      const nextNodes = this.getNextNodes(node.id, graph, undefined);
      for (const nextNode of nextNodes) {
        await this.traverseNode(nextNode, graph, context);
      }
      return;
    }

    // ==========================================
    // TRATAMENTO ESPECIAL: TRY / CATCH
    // ==========================================
    if (node.type === 'try_catch') {
      await this.executeTryCatch(node, graph, context);
      return;
    }

    // ==========================================
    // TRATAMENTO ESPECIAL: LOOP WHILE
    // ==========================================
    if (node.type === 'while_loop') {
      await this.executeWhileLoop(node, graph, context);
      return;
    }

    // ==========================================
    // TRATAMENTO ESPECIAL: LOOP FOR
    // ==========================================
    if (node.type === 'for_loop') {
      await this.executeForLoop(node, graph, context);
      return;
    }

    // ==========================================
    // EXECUÇÃO NORMAL DO NÓ
    // ==========================================
    context.events.onNodeStart?.(node);
    context.log('debug', `Executando nó [${node.type}] (ID: ${node.id})`, node.id);

    const startTime = Date.now();
    let result: NodeExecutionResult;

    try {
      const handler = this.handlers.get(node.type);
      if (!handler) {
        throw new Error(`Nenhum handler registrado para o tipo de nó: ${node.type}`);
      }

      result = await handler.execute(node, context);
      result.startTime = startTime;
      result.endTime = Date.now();
      result.durationMs = result.endTime - startTime;

      context.nodeResults.set(node.id, result);
      context.events.onNodeComplete?.(node, result);
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      result = {
        nodeId: node.id,
        status: 'failed',
        error,
        startTime,
        endTime: Date.now(),
        durationMs: Date.now() - startTime,
      };

      context.nodeResults.set(node.id, result);
      context.events.onNodeError?.(node, error);
      context.log('error', `Erro no nó [${node.id}]: ${error.message}`, node.id);

      if (graph.settings?.stopOnError !== false) {
        throw error;
      }
      return;
    }

    if (context.isCancelled()) return;

    // Descobrir os próximos nós com base no handle de saída retornado pelo nó
    const nextNodes = this.getNextNodes(node.id, graph, result.outputHandle);
    if (nextNodes.length === 0) return;

    // Execução paralela se configurado para Switch (all_matches_parallel)
    const isParallel =
      graph.settings?.parallelBranchesEnabled === true &&
      node.type === 'switch' &&
      (node.data as any).executionMode === 'all_matches_parallel';

    if (isParallel) {
      await Promise.all(nextNodes.map((nxt) => this.traverseNode(nxt, graph, context)));
    } else {
      for (const nextNode of nextNodes) {
        await this.traverseNode(nextNode, graph, context);
      }
    }
  }

  /**
   * Executa bloco de Try/Catch
   */
  private async executeTryCatch(
    node: AnyAutomationNode,
    graph: WebAutomationGraph,
    context: ExecutionContext
  ): Promise<void> {
    const data = node.data as TryCatchNodeData;
    const errorVar = data.errorVarName || 'lastError';

    context.events.onNodeStart?.(node);
    context.log('info', 'Entrando no bloco Try / Catch...', node.id);

    const tryNodes = this.getNextNodes(node.id, graph, 'try_body');
    const catchNodes = this.getNextNodes(node.id, graph, 'catch_branch');
    const defaultNodes = this.getNextNodes(node.id, graph, 'default');

    let succeeded = true;

    try {
      for (const tNode of tryNodes) {
        await this.traverseNode(tNode, graph, context);
      }
    } catch (err: any) {
      succeeded = false;
      const errorMsg = err?.message || String(err);
      context.log('warn', `Exceção capturada no Try/Catch: ${errorMsg}`, node.id);
      context.state.set(errorVar, errorMsg);

      // Desviar para o caminho Catch
      for (const cNode of catchNodes) {
        await this.traverseNode(cNode, graph, context);
      }
    }

    context.events.onNodeComplete?.(node, {
      nodeId: node.id,
      status: 'success',
      outputHandle: succeeded ? 'try_body' : 'catch_branch',
      startTime: Date.now(),
      endTime: Date.now(),
      durationMs: 0,
    });

    // Continua para nós na saída comum (default), se houver
    for (const dNode of defaultNodes) {
      await this.traverseNode(dNode, graph, context);
    }
  }

  /**
   * Executa bloco de Loop While
   */
  private async executeWhileLoop(
    node: AnyAutomationNode,
    graph: WebAutomationGraph,
    context: ExecutionContext
  ): Promise<void> {
    const data = node.data as WhileLoopNodeData;
    const maxIterations = data.maxIterations || 1000;
    let iteration = 0;

    const bodyNodes = this.getNextNodes(node.id, graph, 'loop_body');
    const doneNodes = this.getNextNodes(node.id, graph, 'loop_done');

    context.events.onNodeStart?.(node);

    while (iteration < maxIterations) {
      if (context.isCancelled()) break;
      await context.checkPausePoint();

      let conditionPassed = false;
      if (data.evaluationMode === 'js_eval' || (data.jsExpression && !data.operator)) {
        conditionPassed = Boolean(context.state.evaluateJsExpression(data.jsExpression || ''));
      } else {
        conditionPassed = context.state.evaluateCondition(
          data.leftOperand,
          data.operator,
          data.rightOperand
        );
      }

      if (!conditionPassed) {
        context.log('info', `Loop While finalizado (condição falsa na iteração ${iteration}).`, node.id);
        break;
      }

      iteration++;
      context.log('debug', `Executando iteração #${iteration} do Loop While`, node.id);

      for (const bNode of bodyNodes) {
        await this.traverseNode(bNode, graph, context);
      }
    }

    if (iteration >= maxIterations) {
      context.log('warn', `Loop While atingiu o limite de segurança de ${maxIterations} iterações.`, node.id);
    }

    context.events.onNodeComplete?.(node, {
      nodeId: node.id,
      status: 'success',
      outputHandle: 'loop_done',
      startTime: Date.now(),
      endTime: Date.now(),
      durationMs: 0,
    });

    // Seguir pelo caminho de saída do loop (loop_done ou default)
    const nextAfterLoop = doneNodes.length > 0 ? doneNodes : this.getNextNodes(node.id, graph, 'default');
    for (const dNode of nextAfterLoop) {
      await this.traverseNode(dNode, graph, context);
    }
  }

  /**
   * Executa bloco de Loop For
   */
  private async executeForLoop(
    node: AnyAutomationNode,
    graph: WebAutomationGraph,
    context: ExecutionContext
  ): Promise<void> {
    const data = node.data as ForLoopNodeData;
    const itemVar = data.itemVarName || 'item';
    const indexVar = data.indexVarName || 'index';
    const maxIterations = data.maxIterations || 1000;

    let itemsToIterate: any[] = [];

    if (data.loopType === 'count') {
      const resolvedCount = Number(context.state.interpolate(String(data.countExpression || 0)));
      itemsToIterate = Array.from({ length: Math.min(resolvedCount, maxIterations) }, (_, i) => i);
    } else if (data.loopType === 'js_generator' || data.jsExpression) {
      const evalResult = context.state.evaluateJsExpression(data.jsExpression || '');
      if (Array.isArray(evalResult)) {
        itemsToIterate = evalResult.slice(0, maxIterations);
      } else if (typeof evalResult === 'number') {
        itemsToIterate = Array.from({ length: Math.min(evalResult, maxIterations) }, (_, i) => i);
      } else {
        itemsToIterate = [];
      }
    } else {
      const resolvedArray = typeof data.arrayExpression === 'string'
        ? context.state.resolvePath(data.arrayExpression.replace(/[{}]/g, '').trim()) || []
        : [];
      itemsToIterate = Array.isArray(resolvedArray) ? resolvedArray.slice(0, maxIterations) : [];
    }

    context.events.onNodeStart?.(node);
    context.log('info', `Iniciando Loop For com ${itemsToIterate.length} iterações...`, node.id);

    const bodyNodes = this.getNextNodes(node.id, graph, 'loop_body');
    const doneNodes = this.getNextNodes(node.id, graph, 'loop_done');

    for (let i = 0; i < itemsToIterate.length; i++) {
      if (context.isCancelled()) break;
      await context.checkPausePoint();

      const currentItem = itemsToIterate[i];
      context.state.set(indexVar, i);
      context.state.set(itemVar, currentItem);

      context.log('debug', `Loop For: iteração ${i + 1}/${itemsToIterate.length}`, node.id);

      for (const bNode of bodyNodes) {
        await this.traverseNode(bNode, graph, context);
      }
    }

    context.events.onNodeComplete?.(node, {
      nodeId: node.id,
      status: 'success',
      outputHandle: 'loop_done',
      startTime: Date.now(),
      endTime: Date.now(),
      durationMs: 0,
    });

    // Seguir pelo caminho de saída do loop (loop_done ou default)
    const nextAfterLoop = doneNodes.length > 0 ? doneNodes : this.getNextNodes(node.id, graph, 'default');
    for (const dNode of nextAfterLoop) {
      await this.traverseNode(dNode, graph, context);
    }
  }

  /**
   * Obtém os próximos nós a serem executados a partir das arestas conectadas
   * Aplica a ordenação vertical (menor Y tem prioridade)
   */
  public getNextNodes(
    sourceNodeId: string,
    graph: WebAutomationGraph,
    outputHandle?: string
  ): AnyAutomationNode[] {
    const outgoingEdges = graph.edges.filter((edge) => {
      if (edge.source !== sourceNodeId) return false;
      if (outputHandle !== undefined) {
        return !edge.sourceHandle || edge.sourceHandle === outputHandle;
      }
      return true;
    });

    const targetNodes = outgoingEdges
      .map((edge) => graph.nodes.find((n) => n.id === edge.target))
      .filter((n): n is AnyAutomationNode => n !== undefined);

    // Priorização do caminho superior (menor coordenada Y no editor)
    return targetNodes.sort((a, b) => a.position.y - b.position.y);
  }
}
