import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ExecutionEngine,
  registerAllDefaultHandlers,
  WebAutomationGraph,
  AnyAutomationNode,
} from '../index';
import { MockBrowserDriver } from './MockBrowserDriver';

function createBaseGraph(nodes: AnyAutomationNode[], edges: any[] = []): WebAutomationGraph {
  return {
    schemaVersion: '1.0.0',
    metadata: {
      id: 'test_flow',
      name: 'Test Flow',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    settings: {
      stopOnError: true,
    },
    variables: {},
    nodes,
    edges,
  };
}

test('SUÍTE DE TESTES: Todos os Blocos e Variações de Configuração', async (t: any) => {
  const engine = new ExecutionEngine();
  registerAllDefaultHandlers(engine);

  // =========================================================================
  // CATEGORIA A: CONTROLE DE FLUXO E LÓGICA
  // =========================================================================

  await t.test('1. Bloco de Início (start) - Gatilhos manual, on_url_load, shortcut, mcp, schedule, browser_startup, context_menu, floating_button', async () => {
    const allTriggers = [
      'manual',
      'on_url_load',
      'shortcut',
      'mcp',
      'schedule',
      'browser_startup',
      'context_menu',
      'floating_button',
    ] as const;

    for (const triggerType of allTriggers) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph([
        {
          id: 'start_1',
          type: 'start',
          category: 'flow_logic',
          position: { x: 0, y: 0 },
          data: {
            label: `Início (${triggerType})`,
            triggerType,
            urlPattern: triggerType === 'on_url_load' ? 'https://google.com/*' : undefined,
            shortcutKey: triggerType === 'shortcut' ? 'Ctrl+Shift+U' : undefined,
            intervalMinutes: triggerType === 'schedule' ? 30 : undefined,
            cronExpression: triggerType === 'schedule' ? '0 * * * *' : undefined,
            contextMenuTitle: triggerType === 'context_menu' ? 'Executar Automação no Menu' : undefined,
            floatingButton: triggerType === 'floating_button' ? {
              buttonText: 'Disparar Fluxo',
              buttonIcon: '🚀',
              position: 'bottom-right',
              offsetX: 30,
              offsetY: 30,
              backgroundColor: '#10b981',
              textColor: '#ffffff',
              urlPattern: '*://example.com/*',
            } : undefined,
          },
        },
      ]);

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.status, 'completed', `Gatilho ${triggerType} deve ser completado`);
      const result = context.nodeResults.get('start_1');
      assert.equal(result?.status, 'success');
      assert.equal(result?.outputHandle, 'default');
    }

    // Variação Múltiplos Gatilhos Simultâneos no Mesmo Fluxo
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph([
        {
          id: 'start_multi',
          type: 'start',
          category: 'flow_logic',
          position: { x: 0, y: 0 },
          data: {
            label: 'Início com Múltiplas Formas',
            triggers: [
              { type: 'manual', enabled: true },
              { type: 'shortcut', shortcutKey: 'Ctrl+Shift+F', enabled: true },
              { type: 'context_menu', contextMenuTitle: 'Disparar Fluxo Completo', enabled: true },
              { type: 'schedule', intervalMinutes: 60, enabled: true },
              {
                type: 'floating_button',
                floatingButton: {
                  buttonText: 'Executar Agora',
                  iconType: 'svg',
                  svgIcon: '<svg><circle cx="12" cy="12" r="10"/></svg>',
                  position: 'bottom-right',
                },
                enabled: true,
              },
            ],
          },
        },
      ]);

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.status, 'completed');
      const startNode = graph.nodes.find((n) => n.id === 'start_multi');
      assert.ok(startNode);
      const data = startNode!.data as any;
      assert.equal(data.triggers.length, 5, 'Deve conter 5 formas simultâneas de disparo');
      assert.equal(data.triggers[4].floatingButton.iconType, 'svg');
    }

    // Variação Múltiplas URLs de Execução
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph([
        {
          id: 'start_multi_url',
          type: 'start',
          category: 'flow_logic',
          position: { x: 0, y: 0 },
          data: {
            label: 'Início por Múltiplas URLs',
            triggerType: 'on_url_load',
            urlPatterns: [
              'https://app.sistema.com/*',
              'https://painel.sistema.com/dashboard',
              'https://admin.sistema.com/*',
            ],
          },
        },
      ]);

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.status, 'completed');
      const startNode = graph.nodes.find((n) => n.id === 'start_multi_url');
      assert.ok(startNode);
      const data = startNode!.data as any;
      assert.equal(data.urlPatterns.length, 3, 'Deve conter 3 URLs de execução cadastradas');
    }
  });

  await t.test('2. Bloco Delay - Pausa fixa e randômica', async () => {
    // Variação 1: Delay Fixo
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start_1', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'delay_1', type: 'delay', category: 'flow_logic', position: { x: 100, y: 0 }, data: { isRandom: false, fixedMs: 10 } },
        ],
        [{ id: 'e1', source: 'start_1', target: 'delay_1', sourceHandle: 'default' }]
      );
      const start = Date.now();
      const context = await engine.runGraph(graph, driver);
      const duration = Date.now() - start;
      assert.equal(context.status, 'completed');
      assert.ok(duration >= 9, 'Deve esperar pelo menos ~10ms');
    }

    // Variação 2: Delay Randômico
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start_1', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'delay_2', type: 'delay', category: 'flow_logic', position: { x: 100, y: 0 }, data: { isRandom: true, randomRange: { minMs: 15, maxMs: 30 } } },
        ],
        [{ id: 'e1', source: 'start_1', target: 'delay_2', sourceHandle: 'default' }]
      );
      const start = Date.now();
      const context = await engine.runGraph(graph, driver);
      const duration = Date.now() - start;
      assert.equal(context.status, 'completed');
      assert.ok(duration >= 14, 'Deve aguardar dentro do intervalo randômico');
    }
  });

  await t.test('3. Bloco Switch - Operadores lógicos e desvios de fluxo', async () => {
    const testOperators = [
      { op: 'equals', left: '200', right: '200', expectedCase: 'case_match' },
      { op: 'not_equals', left: '404', right: '200', expectedCase: 'case_match' },
      { op: 'contains', left: 'webautomation studio', right: 'studio', expectedCase: 'case_match' },
      { op: 'greater_than', left: '50', right: '10', expectedCase: 'case_match' },
      { op: 'less_than', left: '5', right: '20', expectedCase: 'case_match' },
      { op: 'greater_or_equal', left: '10', right: '10', expectedCase: 'case_match' },
      { op: 'less_or_equal', left: '10', right: '10', expectedCase: 'case_match' },
      { op: 'is_empty', left: '', right: '', expectedCase: 'case_match' },
      { op: 'is_not_empty', left: 'filled', right: '', expectedCase: 'case_match' },
      { op: 'regex_match', left: 'ABC-1234', right: '^[A-Z]{3}-\\d{4}$', expectedCase: 'case_match' },
    ] as const;

    for (const testItem of testOperators) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'switch_node',
            type: 'switch',
            category: 'flow_logic',
            position: { x: 100, y: 0 },
            data: {
              executionMode: 'first_match',
              hasDefaultBranch: true,
              cases: [
                {
                  id: 'case_match',
                  label: 'Sucesso',
                  leftOperand: testItem.left,
                  operator: testItem.op,
                  rightOperand: testItem.right,
                },
              ],
            },
          },
          { id: 'node_match', type: 'set_variable', category: 'data_network', position: { x: 200, y: -50 }, data: { varName: 'result', evaluationType: 'literal', valueExpression: 'matched' } },
          { id: 'node_default', type: 'set_variable', category: 'data_network', position: { x: 200, y: 50 }, data: { varName: 'result', evaluationType: 'literal', valueExpression: 'default_fallback' } },
        ],
        [
          { id: 'e1', source: 'start', target: 'switch_node', sourceHandle: 'default' },
          { id: 'e2', source: 'switch_node', target: 'node_match', sourceHandle: 'case_match' },
          { id: 'e3', source: 'switch_node', target: 'node_default', sourceHandle: 'default' },
        ]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('result'), 'matched', `Operador ${testItem.op} deve desviar para case_match`);
    }

    // Variação de Switch: Nenhuma condição atendida -> Desvia para Default
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'switch_node',
            type: 'switch',
            category: 'flow_logic',
            position: { x: 100, y: 0 },
            data: {
              executionMode: 'first_match',
              hasDefaultBranch: true,
              cases: [
                { id: 'case_1', label: 'Incompatível', leftOperand: 'A', operator: 'equals', rightOperand: 'B' },
              ],
            },
          },
          { id: 'node_default', type: 'set_variable', category: 'data_network', position: { x: 200, y: 50 }, data: { varName: 'status', evaluationType: 'literal', valueExpression: 'fallback' } },
        ],
        [
          { id: 'e1', source: 'start', target: 'switch_node', sourceHandle: 'default' },
          { id: 'e2', source: 'switch_node', target: 'node_default', sourceHandle: 'default' },
        ]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('status'), 'fallback', 'Deve seguir para caminho default');
    }
  });

  await t.test('4. Bloco Loop While - Repetição condicional e saída', async () => {
    const driver = new MockBrowserDriver();
    const graph = createBaseGraph(
      [
        { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
        { id: 'init_var', type: 'set_variable', category: 'data_network', position: { x: 50, y: 0 }, data: { varName: 'counter', evaluationType: 'literal', valueExpression: 0 } },
        {
          id: 'while_node',
          type: 'while_loop',
          category: 'flow_logic',
          position: { x: 150, y: 0 },
          data: {
            leftOperand: '{{counter}}',
            operator: 'less_than',
            rightOperand: '3',
            maxIterations: 10,
          },
        },
        {
          id: 'step_var',
          type: 'set_variable',
          category: 'data_network',
          position: { x: 250, y: -50 },
          data: {
            varName: 'counter',
            evaluationType: 'js_eval',
            valueExpression: '{{counter}} + 1',
          },
        },
        {
          id: 'after_loop',
          type: 'set_variable',
          category: 'data_network',
          position: { x: 350, y: 50 },
          data: {
            varName: 'done',
            evaluationType: 'literal',
            valueExpression: true,
          },
        },
      ],
      [
        { id: 'e1', source: 'start', target: 'init_var', sourceHandle: 'default' },
        { id: 'e2', source: 'init_var', target: 'while_node', sourceHandle: 'default' },
        { id: 'e3', source: 'while_node', target: 'step_var', sourceHandle: 'loop_body' },
        { id: 'e4', source: 'while_node', target: 'after_loop', sourceHandle: 'loop_done' },
      ]
    );

    const context = await engine.runGraph(graph, driver);
    assert.equal(context.state.get('counter'), 3, 'O contador deve atingir 3');
    assert.equal(context.state.get('done'), true, 'O fluxo deve seguir para loop_done');
  });

  await t.test('5. Bloco Loop For - Tipo Count e Tipo Array', async () => {
    // Variação 1: Loop For por Contagem (count)
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'init_sum', type: 'set_variable', category: 'data_network', position: { x: 50, y: 0 }, data: { varName: 'sum', evaluationType: 'literal', valueExpression: 0 } },
          {
            id: 'for_count',
            type: 'for_loop',
            category: 'flow_logic',
            position: { x: 150, y: 0 },
            data: {
              loopType: 'count',
              countExpression: 4,
              itemVarName: 'num',
              indexVarName: 'idx',
            },
          },
          {
            id: 'add_sum',
            type: 'set_variable',
            category: 'data_network',
            position: { x: 250, y: -50 },
            data: {
              varName: 'sum',
              evaluationType: 'js_eval',
              valueExpression: '{{sum}} + 1',
            },
          },
        ],
        [
          { id: 'e1', source: 'start', target: 'init_sum', sourceHandle: 'default' },
          { id: 'e2', source: 'init_sum', target: 'for_count', sourceHandle: 'default' },
          { id: 'e3', source: 'for_count', target: 'add_sum', sourceHandle: 'loop_body' },
        ]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('sum'), 4, 'Loop For por contagem deve executar 4 vezes');
    }

    // Variação 2: Loop For por Array
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'init_list', type: 'set_variable', category: 'data_network', position: { x: 50, y: 0 }, data: { varName: 'names', evaluationType: 'literal', valueExpression: ['Ana', 'Bia', 'Caio'] } },
          { id: 'init_acc', type: 'set_variable', category: 'data_network', position: { x: 70, y: 0 }, data: { varName: 'concatenated', evaluationType: 'literal', valueExpression: '' } },
          {
            id: 'for_array',
            type: 'for_loop',
            category: 'flow_logic',
            position: { x: 150, y: 0 },
            data: {
              loopType: 'array',
              arrayExpression: '{{names}}',
              itemVarName: 'person',
              indexVarName: 'pos',
            },
          },
          {
            id: 'append_name',
            type: 'set_variable',
            category: 'data_network',
            position: { x: 250, y: -50 },
            data: {
              varName: 'concatenated',
              evaluationType: 'js_eval',
              valueExpression: '`{{concatenated}}/${person}`',
            },
          },
        ],
        [
          { id: 'e1', source: 'start', target: 'init_list', sourceHandle: 'default' },
          { id: 'e2', source: 'init_list', target: 'init_acc', sourceHandle: 'default' },
          { id: 'e3', source: 'init_acc', target: 'for_array', sourceHandle: 'default' },
          { id: 'e4', source: 'for_array', target: 'append_name', sourceHandle: 'loop_body' },
        ]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('concatenated'), '/Ana/Bia/Caio', 'Loop For por Array deve iterar sobre cada elemento');
    }

    // Variação 3: Switch, While e For com Código JS Customizado
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'init_user', type: 'set_variable', category: 'data_network', position: { x: 50, y: 0 }, data: { varName: 'score', evaluationType: 'literal', valueExpression: 85 } },
          {
            id: 'switch_js',
            type: 'switch',
            category: 'flow_logic',
            position: { x: 150, y: 0 },
            data: {
              executionMode: 'first_match',
              hasDefaultBranch: true,
              cases: [
                {
                  id: 'c_high',
                  label: 'Nota Alta',
                  evaluationMode: 'js_eval',
                  jsExpression: 'score >= 80',
                },
                {
                  id: 'c_low',
                  label: 'Nota Baixa',
                  evaluationMode: 'js_eval',
                  jsExpression: 'score < 80',
                },
              ],
            },
          },
          { id: 'set_grade', type: 'set_variable', category: 'data_network', position: { x: 250, y: 0 }, data: { varName: 'grade', evaluationType: 'literal', valueExpression: 'A' } },
          // While com JS
          { id: 'init_n', type: 'set_variable', category: 'data_network', position: { x: 350, y: 0 }, data: { varName: 'n', evaluationType: 'literal', valueExpression: 1 } },
          {
            id: 'while_js',
            type: 'while_loop',
            category: 'flow_logic',
            position: { x: 450, y: 0 },
            data: {
              evaluationMode: 'js_eval',
              jsExpression: 'n < 4',
            },
          },
          { id: 'inc_n', type: 'set_variable', category: 'data_network', position: { x: 550, y: -50 }, data: { varName: 'n', evaluationType: 'js_eval', valueExpression: 'n + 1' } },
          // For com JS Generator
          {
            id: 'for_js',
            type: 'for_loop',
            category: 'flow_logic',
            position: { x: 650, y: 0 },
            data: {
              loopType: 'js_generator',
              jsExpression: '["item1", "item2"].map(x => x.toUpperCase())',
              itemVarName: 'currentVal',
              indexVarName: 'currentIdx',
            },
          },
          { id: 'save_last', type: 'set_variable', category: 'data_network', position: { x: 750, y: -50 }, data: { varName: 'lastVal', evaluationType: 'template', valueExpression: '{{currentVal}}' } },
        ],
        [
          { id: 'e1', source: 'start', target: 'init_user', sourceHandle: 'default' },
          { id: 'e2', source: 'init_user', target: 'switch_js', sourceHandle: 'default' },
          { id: 'e3', source: 'switch_js', target: 'set_grade', sourceHandle: 'c_high' },
          { id: 'e4', source: 'set_grade', target: 'init_n', sourceHandle: 'default' },
          { id: 'e5', source: 'init_n', target: 'while_js', sourceHandle: 'default' },
          { id: 'e6', source: 'while_js', target: 'inc_n', sourceHandle: 'loop_body' },
          { id: 'e7', source: 'while_js', target: 'for_js', sourceHandle: 'loop_done' },
          { id: 'e8', source: 'for_js', target: 'save_last', sourceHandle: 'loop_body' },
        ]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('grade'), 'A', 'Switch com JS deve avaliar score >= 80 como verdadeiro');
      assert.equal(context.state.get('n'), 4, 'While com JS deve rodar até n atingir 4');
      assert.equal(context.state.get('lastVal'), 'ITEM2', 'For com JS Generator deve iterar a lista gerada');
    }
  });

  await t.test('6. Bloco Se Elemento Existir (if_element_exists) - True vs False branches', async () => {
    // Caso 1: Elemento existe -> Segue ramo true
    {
      const driver = new MockBrowserDriver();
      driver.elementsMap.set('.btn-submit', { exists: true });
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'check_btn', type: 'if_element_exists', category: 'flow_logic', position: { x: 100, y: 0 }, data: { selector: '.btn-submit', selectorType: 'css', timeoutMs: 1000 } },
          { id: 'branch_true', type: 'set_variable', category: 'data_network', position: { x: 200, y: -50 }, data: { varName: 'btnFound', evaluationType: 'literal', valueExpression: 'YES' } },
          { id: 'branch_false', type: 'set_variable', category: 'data_network', position: { x: 200, y: 50 }, data: { varName: 'btnFound', evaluationType: 'literal', valueExpression: 'NO' } },
        ],
        [
          { id: 'e1', source: 'start', target: 'check_btn', sourceHandle: 'default' },
          { id: 'e2', source: 'check_btn', target: 'branch_true', sourceHandle: 'true' },
          { id: 'e3', source: 'check_btn', target: 'branch_false', sourceHandle: 'false' },
        ]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('btnFound'), 'YES');
    }

    // Caso 2: Elemento NÃO existe -> Segue ramo false
    {
      const driver = new MockBrowserDriver();
      driver.elementsMap.set('.btn-submit', { exists: false });
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'check_btn', type: 'if_element_exists', category: 'flow_logic', position: { x: 100, y: 0 }, data: { selector: '.btn-submit', selectorType: 'css', timeoutMs: 1000 } },
          { id: 'branch_true', type: 'set_variable', category: 'data_network', position: { x: 200, y: -50 }, data: { varName: 'btnFound', evaluationType: 'literal', valueExpression: 'YES' } },
          { id: 'branch_false', type: 'set_variable', category: 'data_network', position: { x: 200, y: 50 }, data: { varName: 'btnFound', evaluationType: 'literal', valueExpression: 'NO' } },
        ],
        [
          { id: 'e1', source: 'start', target: 'check_btn', sourceHandle: 'default' },
          { id: 'e2', source: 'check_btn', target: 'branch_true', sourceHandle: 'true' },
          { id: 'e3', source: 'check_btn', target: 'branch_false', sourceHandle: 'false' },
        ]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('btnFound'), 'NO');
    }
  });

  await t.test('7. Bloco Tentar / Capturar (try_catch) - Sucesso e Tratamento de Exceção', async () => {
    // Variação 1: Sucesso no bloco protegido
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'tc', type: 'try_catch', category: 'flow_logic', position: { x: 100, y: 0 }, data: { errorVarName: 'err' } },
          { id: 'try_work', type: 'set_variable', category: 'data_network', position: { x: 200, y: -50 }, data: { varName: 'tryDone', evaluationType: 'literal', valueExpression: true } },
          { id: 'catch_work', type: 'set_variable', category: 'data_network', position: { x: 200, y: 50 }, data: { varName: 'catchRan', evaluationType: 'literal', valueExpression: true } },
        ],
        [
          { id: 'e1', source: 'start', target: 'tc', sourceHandle: 'default' },
          { id: 'e2', source: 'tc', target: 'try_work', sourceHandle: 'try_body' },
          { id: 'e3', source: 'tc', target: 'catch_work', sourceHandle: 'catch_branch' },
        ]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('tryDone'), true);
      assert.equal(context.state.get('catchRan'), undefined);
    }

    // Variação 2: Falha no bloco protegido -> Capturado e tratado no Catch
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'tc', type: 'try_catch', category: 'flow_logic', position: { x: 100, y: 0 }, data: { errorVarName: 'err' } },
          // Código inválido para forçar exceção no try
          { id: 'failing_node', type: 'set_variable', category: 'data_network', position: { x: 200, y: -50 }, data: { varName: 'x', evaluationType: 'js_eval', valueExpression: 'variavelInexistente.metodo()' } },
          { id: 'catch_recovery', type: 'set_variable', category: 'data_network', position: { x: 200, y: 50 }, data: { varName: 'recovered', evaluationType: 'literal', valueExpression: 'ok' } },
        ],
        [
          { id: 'e1', source: 'start', target: 'tc', sourceHandle: 'default' },
          { id: 'e2', source: 'tc', target: 'failing_node', sourceHandle: 'try_body' },
          { id: 'e3', source: 'tc', target: 'catch_recovery', sourceHandle: 'catch_branch' },
        ]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('recovered'), 'ok', 'Deve desviar para o fluxo do catch');
      assert.ok(context.state.get('err'), 'Deve gravar mensagem de erro na variável configurada');
    }
  });

  await t.test('8. Bloco Grupo (group) e Bloco Nota (note) - Pass-through visual', async () => {
    const driver = new MockBrowserDriver();
    const graph = createBaseGraph(
      [
        { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
        { id: 'note_1', type: 'note', category: 'injection_customization', position: { x: 50, y: 0 }, data: { content: 'Nota explicativa' } },
        { id: 'group_1', type: 'group', category: 'flow_logic', position: { x: 100, y: 0 }, data: { label: 'Grupo Alpha', childNodeIds: [] } },
        { id: 'final_node', type: 'set_variable', category: 'data_network', position: { x: 200, y: 0 }, data: { varName: 'reached', evaluationType: 'literal', valueExpression: true } },
      ],
      [
        { id: 'e1', source: 'start', target: 'note_1', sourceHandle: 'default' },
        { id: 'e2', source: 'note_1', target: 'group_1', sourceHandle: 'default' },
        { id: 'e3', source: 'group_1', target: 'final_node', sourceHandle: 'default' },
      ]
    );

    const context = await engine.runGraph(graph, driver);
    assert.equal(context.state.get('reached'), true, 'Nós visuais devem permitir passagem do fluxo');
  });

  // =========================================================================
  // CATEGORIA B: NAVEGAÇÃO (BROWSER API)
  // =========================================================================

  await t.test('9. Bloco Navegar (navigate) - Variações de waitUntil e Interpolação de URL', async () => {
    for (const waitUntil of ['load', 'domcontentloaded', 'networkidle', 'none'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'set_url', type: 'set_variable', category: 'data_network', position: { x: 50, y: 0 }, data: { varName: 'site', evaluationType: 'literal', valueExpression: 'https://github.com' } },
          { id: 'nav', type: 'navigate', category: 'browser_navigation', position: { x: 150, y: 0 }, data: { url: '{{site}}/features', waitUntil, timeoutMs: 15000 } },
        ],
        [
          { id: 'e1', source: 'start', target: 'set_url', sourceHandle: 'default' },
          { id: 'e2', source: 'set_url', target: 'nav', sourceHandle: 'default' },
        ]
      );

      await engine.runGraph(graph, driver);
      assert.equal(driver.currentUrl, 'https://github.com/features');
      const call = driver.calls.find((c) => c.method === 'navigateTo');
      assert.equal(call?.args[1], waitUntil);
    }
  });

  await t.test('10. Bloco Ações de Aba (tab_action) - new_tab, switch_tab, close_tab, get_current_url', async () => {
    const driver = new MockBrowserDriver();
    driver.currentUrl = 'https://portal.com/dashboard';

    const graph = createBaseGraph(
      [
        { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
        { id: 'tab_new', type: 'tab_action', category: 'browser_navigation', position: { x: 100, y: 0 }, data: { action: 'new_tab', url: 'https://portal.com/help', active: true } },
        { id: 'tab_url', type: 'tab_action', category: 'browser_navigation', position: { x: 200, y: 0 }, data: { action: 'get_current_url', saveUrlToVar: 'activeUrl' } },
        { id: 'tab_switch', type: 'tab_action', category: 'browser_navigation', position: { x: 300, y: 0 }, data: { action: 'switch_tab', queryType: 'title', queryValue: 'Portal' } },
        { id: 'tab_close', type: 'tab_action', category: 'browser_navigation', position: { x: 400, y: 0 }, data: { action: 'close_tab', queryType: 'index', queryValue: 2 } },
      ],
      [
        { id: 'e1', source: 'start', target: 'tab_new', sourceHandle: 'default' },
        { id: 'e2', source: 'tab_new', target: 'tab_url', sourceHandle: 'default' },
        { id: 'e3', source: 'tab_url', target: 'tab_switch', sourceHandle: 'default' },
        { id: 'e4', source: 'tab_switch', target: 'tab_close', sourceHandle: 'default' },
      ]
    );

    const context = await engine.runGraph(graph, driver);
    assert.equal(context.status, 'completed');
    assert.equal(context.state.get('activeUrl'), 'https://portal.com/dashboard');
    assert.ok(driver.calls.some((c) => c.method === 'createTab'));
    assert.ok(driver.calls.some((c) => c.method === 'switchTab'));
    assert.ok(driver.calls.some((c) => c.method === 'closeTab'));
  });

  await t.test('11. Bloco Histórico de Navegação (history_navigation) - back, forward, reload', async () => {
    for (const action of ['back', 'forward', 'reload'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'hist', type: 'history_navigation', category: 'browser_navigation', position: { x: 100, y: 0 }, data: { action, ignoreCache: true } },
        ],
        [{ id: 'e1', source: 'start', target: 'hist', sourceHandle: 'default' }]
      );

      await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'navigateHistory');
      assert.equal(call?.args[0], action);
    }
  });

  // =========================================================================
  // CATEGORIA C: INTERAÇÃO COM A PÁGINA (DOM)
  // =========================================================================

  await t.test('12. Bloco Clicar em Elemento (click_element) - single, double, contextmenu e coordenadas', async () => {
    for (const clickType of ['single', 'double', 'contextmenu'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'click',
            type: 'click_element',
            category: 'dom_interaction',
            position: { x: 100, y: 0 },
            data: {
              selector: '#button-action',
              selectorType: 'css',
              clickType,
              clickCoordinates: { x: 12, y: 8 },
              timeoutMs: 3000,
            },
          },
        ],
        [{ id: 'e1', source: 'start', target: 'click', sourceHandle: 'default' }]
      );

      await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'clickElement');
      assert.equal(call?.args[0], '#button-action');
      assert.equal(call?.args[2], clickType);
      assert.deepEqual(call?.args[4], { x: 12, y: 8 });
    }
  });

  await t.test('13. Bloco Digitar Texto (type_input) - human_typing vs paste, limpar e Enter', async () => {
    for (const mode of ['human_typing', 'paste'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'type',
            type: 'type_input',
            category: 'dom_interaction',
            position: { x: 100, y: 0 },
            data: {
              selector: 'input[name="search"]',
              selectorType: 'css',
              text: 'Teste de Automação',
              mode,
              clearBeforeTyping: true,
              pressEnterAfter: true,
              minTypingDelayMs: 30,
              maxTypingDelayMs: 80,
            },
          },
        ],
        [{ id: 'e1', source: 'start', target: 'type', sourceHandle: 'default' }]
      );

      await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'typeText');
      assert.equal(call?.args[0], 'input[name="search"]');
      assert.equal(call?.args[2], 'Teste de Automação');
      assert.equal(call?.args[3], mode);
      assert.equal(call?.args[6], true, 'clearBeforeTyping');
      assert.equal(call?.args[7], true, 'pressEnterAfter');
    }
  });

  await t.test('14. Bloco Pressionar Tecla (press_key) - Teclas e Modificadores (ctrl, alt, shift)', async () => {
    const driver = new MockBrowserDriver();
    const graph = createBaseGraph(
      [
        { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
        {
          id: 'key_press',
          type: 'press_key',
          category: 'dom_interaction',
          position: { x: 100, y: 0 },
          data: {
            key: 's',
            modifiers: ['ctrl', 'shift'],
            selector: 'textarea.editor',
            selectorType: 'css',
          },
        },
      ],
      [{ id: 'e1', source: 'start', target: 'key_press', sourceHandle: 'default' }]
    );

    await engine.runGraph(graph, driver);
    const call = driver.calls.find((c) => c.method === 'pressKey');
    assert.equal(call?.args[0], 's');
    assert.deepEqual(call?.args[1], ['ctrl', 'shift']);
    assert.equal(call?.args[2], 'textarea.editor');
  });

  await t.test('15. Bloco Foco / Hover (hover_focus) - hover e focus', async () => {
    for (const action of ['hover', 'focus'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'hf', type: 'hover_focus', category: 'dom_interaction', position: { x: 100, y: 0 }, data: { selector: '.menu-item', selectorType: 'css', action, timeoutMs: 2000 } },
        ],
        [{ id: 'e1', source: 'start', target: 'hf', sourceHandle: 'default' }]
      );

      await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'hoverOrFocus');
      assert.equal(call?.args[0], '.menu-item');
      assert.equal(call?.args[2], action);
    }
  });

  await t.test('16. Bloco Rolar Página (scroll) - top, bottom, element, by_pixels', async () => {
    for (const target of ['top', 'bottom', 'element', 'by_pixels'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'scroll',
            type: 'scroll',
            category: 'dom_interaction',
            position: { x: 100, y: 0 },
            data: {
              target,
              selector: target === 'element' ? '#footer' : undefined,
              selectorType: 'css',
              deltaX: target === 'by_pixels' ? 0 : undefined,
              deltaY: target === 'by_pixels' ? 500 : undefined,
              smooth: true,
            },
          },
        ],
        [{ id: 'e1', source: 'start', target: 'scroll', sourceHandle: 'default' }]
      );

      await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'scroll');
      assert.equal(call?.args[0], target);
    }
  });

  await t.test('17. Bloco Esperar Elemento (wait_for_element) - visible, hidden, clickable, attached', async () => {
    for (const state of ['visible', 'hidden', 'clickable', 'attached'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'wait', type: 'wait_for_element', category: 'dom_interaction', position: { x: 100, y: 0 }, data: { selector: '.loading-spinner', selectorType: 'css', state, timeoutMs: 5000 } },
        ],
        [{ id: 'e1', source: 'start', target: 'wait', sourceHandle: 'default' }]
      );

      await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'waitForElement');
      assert.equal(call?.args[0], '.loading-spinner');
      assert.equal(call?.args[2], state);
    }
  });

  // =========================================================================
  // CATEGORIA D: DADOS, VARIÁVEIS E REDE
  // =========================================================================

  await t.test('18. Bloco Definir Variável (set_variable) - literal, template, js_eval', async () => {
    const driver = new MockBrowserDriver();
    const graph = createBaseGraph(
      [
        { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
        // Literal
        { id: 'v_lit', type: 'set_variable', category: 'data_network', position: { x: 50, y: 0 }, data: { varName: 'basePrice', evaluationType: 'literal', valueExpression: 100 } },
        // Template
        { id: 'v_tpl', type: 'set_variable', category: 'data_network', position: { x: 150, y: 0 }, data: { varName: 'currency', evaluationType: 'literal', valueExpression: 'BRL' } },
        { id: 'v_tpl2', type: 'set_variable', category: 'data_network', position: { x: 250, y: 0 }, data: { varName: 'formatted', evaluationType: 'template', valueExpression: '{{currency}} {{basePrice}}' } },
        // JS Eval
        { id: 'v_eval', type: 'set_variable', category: 'data_network', position: { x: 350, y: 0 }, data: { varName: 'withDiscount', evaluationType: 'js_eval', valueExpression: 'Number({{basePrice}}) * 0.9' } },
      ],
      [
        { id: 'e1', source: 'start', target: 'v_lit', sourceHandle: 'default' },
        { id: 'e2', source: 'v_lit', target: 'v_tpl', sourceHandle: 'default' },
        { id: 'e3', source: 'v_tpl', target: 'v_tpl2', sourceHandle: 'default' },
        { id: 'e4', source: 'v_tpl2', target: 'v_eval', sourceHandle: 'default' },
      ]
    );

    const context = await engine.runGraph(graph, driver);
    assert.equal(context.state.get('basePrice'), 100);
    assert.equal(context.state.get('formatted'), 'BRL 100');
    assert.equal(context.state.get('withDiscount'), 90);
  });

  await t.test('19. Bloco Extrair Dados (extract_data) - innerText, innerHTML, attribute, value', async () => {
    const driver = new MockBrowserDriver();
    driver.elementsMap.set('h1.title', { exists: true, text: 'Página Inicial' });
    driver.elementsMap.set('div.content', { exists: true, html: '<span>Conteúdo</span>' });
    driver.elementsMap.set('a.link', { exists: true, attr: { href: 'https://site.com/docs' } });
    driver.elementsMap.set('input#user', { exists: true, text: 'admin' });

    const graph = createBaseGraph(
      [
        { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
        { id: 'ext_text', type: 'extract_data', category: 'data_network', position: { x: 100, y: 0 }, data: { selector: 'h1.title', selectorType: 'css', extractType: 'innerText', saveToVar: 'title' } },
        { id: 'ext_html', type: 'extract_data', category: 'data_network', position: { x: 200, y: 0 }, data: { selector: 'div.content', selectorType: 'css', extractType: 'innerHTML', saveToVar: 'htmlBody' } },
        { id: 'ext_attr', type: 'extract_data', category: 'data_network', position: { x: 300, y: 0 }, data: { selector: 'a.link', selectorType: 'css', extractType: 'attribute', attributeName: 'href', saveToVar: 'docsUrl' } },
        { id: 'ext_val', type: 'extract_data', category: 'data_network', position: { x: 400, y: 0 }, data: { selector: 'input#user', selectorType: 'css', extractType: 'value', saveToVar: 'username' } },
      ],
      [
        { id: 'e1', source: 'start', target: 'ext_text', sourceHandle: 'default' },
        { id: 'e2', source: 'ext_text', target: 'ext_html', sourceHandle: 'default' },
        { id: 'e3', source: 'ext_html', target: 'ext_attr', sourceHandle: 'default' },
        { id: 'e4', source: 'ext_attr', target: 'ext_val', sourceHandle: 'default' },
      ]
    );

    const context = await engine.runGraph(graph, driver);
    assert.equal(context.state.get('title'), 'Página Inicial');
    assert.equal(context.state.get('htmlBody'), '<span>Conteúdo</span>');
    assert.equal(context.state.get('docsUrl'), 'https://site.com/docs');
    assert.equal(context.state.get('username'), 'admin');
  });

  await t.test('20. Bloco Extrair Lista (scrape_list) - Extração com múltiplos campos e limite', async () => {
    const driver = new MockBrowserDriver();
    const graph = createBaseGraph(
      [
        { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
        {
          id: 'scrape',
          type: 'scrape_list',
          category: 'data_network',
          position: { x: 100, y: 0 },
          data: {
            selector: '.product-card',
            selectorType: 'css',
            maxItems: 20,
            saveToVar: 'products',
            fields: [
              { name: 'name', subSelector: '.prod-title', extractType: 'innerText' },
              { name: 'link', subSelector: 'a', extractType: 'attribute', attributeName: 'href' },
            ],
          },
        },
      ],
      [{ id: 'e1', source: 'start', target: 'scrape', sourceHandle: 'default' }]
    );

    const context = await engine.runGraph(graph, driver);
    const products = context.state.get('products');
    assert.ok(Array.isArray(products));
    assert.equal(products.length, 2);
  });

  await t.test('21. Bloco Exportar Arquivo (export_file) - Formatos JSON e CSV', async () => {
    // Variação 1: Exportar JSON
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'set_data', type: 'set_variable', category: 'data_network', position: { x: 50, y: 0 }, data: { varName: 'users', evaluationType: 'literal', valueExpression: [{ id: 1, name: 'Alice' }] } },
          { id: 'export_json', type: 'export_file', category: 'data_network', position: { x: 150, y: 0 }, data: { sourceVar: 'users', format: 'json', filename: 'users.json' } },
        ],
        [
          { id: 'e1', source: 'start', target: 'set_data', sourceHandle: 'default' },
          { id: 'e2', source: 'set_data', target: 'export_json', sourceHandle: 'default' },
        ]
      );

      await engine.runGraph(graph, driver);
      const file = driver.downloadedFiles.find((f) => f.filename === 'users.json');
      assert.ok(file);
      assert.equal(file!.mimeType, 'application/json');
      assert.ok(file!.content.includes('"Alice"'));
    }

    // Variação 2: Exportar CSV
    {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          { id: 'set_data', type: 'set_variable', category: 'data_network', position: { x: 50, y: 0 }, data: { varName: 'rows', evaluationType: 'literal', valueExpression: [{ id: 10, item: 'Mouse' }, { id: 20, item: 'Teclado' }] } },
          { id: 'export_csv', type: 'export_file', category: 'data_network', position: { x: 150, y: 0 }, data: { sourceVar: 'rows', format: 'csv', filename: 'produtos.csv', csvDelimiter: ';' } },
        ],
        [
          { id: 'e1', source: 'start', target: 'set_data', sourceHandle: 'default' },
          { id: 'e2', source: 'set_data', target: 'export_csv', sourceHandle: 'default' },
        ]
      );

      await engine.runGraph(graph, driver);
      const file = driver.downloadedFiles.find((f) => f.filename === 'produtos.csv');
      assert.ok(file);
      assert.equal(file!.mimeType, 'text/csv');
      assert.ok(file!.content.includes('id;item'));
      assert.ok(file!.content.includes('"Teclado"'));
    }
  });

  await t.test('22. Bloco Requisição HTTP (http_request) - Mock fetch GET e POST com Headers/Body', async () => {
    const originalFetch = globalThis.fetch;
    try {
      (globalThis as any).fetch = async (url: string, opts: any) => {
        return {
          status: 201,
          ok: true,
          json: async () => ({ success: true, createdId: 99, receivedMethod: opts?.method }),
          text: async () => 'OK',
        };
      };

      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'req',
            type: 'http_request',
            category: 'data_network',
            position: { x: 100, y: 0 },
            data: {
              url: 'https://api.test.com/items',
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token123' },
              body: '{"name":"Novo Item"}',
              responseType: 'json',
              saveResponseToVar: 'apiRes',
              saveStatusToVar: 'apiStatus',
            },
          },
        ],
        [{ id: 'e1', source: 'start', target: 'req', sourceHandle: 'default' }]
      );

      const context = await engine.runGraph(graph, driver);
      assert.equal(context.state.get('apiStatus'), 201);
      assert.deepEqual(context.state.get('apiRes'), { success: true, createdId: 99, receivedMethod: 'POST' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // =========================================================================
  // CATEGORIA E: INJEÇÃO E CUSTOMIZAÇÃO
  // =========================================================================

  await t.test('23. Bloco Injetar JavaScript (inject_javascript) - content_script e background com retorno', async () => {
    for (const ctx of ['content_script', 'background'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'inject',
            type: 'inject_javascript',
            category: 'injection_customization',
            position: { x: 100, y: 0 },
            data: {
              code: 'document.title = "Título Alterado"; return window.location.href;',
              context: ctx,
              args: ['userToken'],
              saveResultToVar: 'scriptOutput',
            },
          },
        ],
        [{ id: 'e1', source: 'start', target: 'inject', sourceHandle: 'default' }]
      );

      const context = await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'injectScript');
      assert.equal(call?.args[1], ctx);
      assert.ok(context.state.get('scriptOutput'));
    }
  });

  await t.test('24. Bloco Injetar HTML (inject_html) - beforebegin, afterbegin, beforeend, afterend', async () => {
    for (const position of ['beforebegin', 'afterbegin', 'beforeend', 'afterend'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'inj_html',
            type: 'inject_html',
            category: 'injection_customization',
            position: { x: 100, y: 0 },
            data: {
              html: '<div class="banner">Aviso Legal</div>',
              targetSelector: '#container',
              selectorType: 'css',
              position,
            },
          },
        ],
        [{ id: 'e1', source: 'start', target: 'inj_html', sourceHandle: 'default' }]
      );

      await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'injectHtml');
      assert.equal(call?.args[0], '<div class="banner">Aviso Legal</div>');
      assert.equal(call?.args[1], '#container');
      assert.equal(call?.args[2], position);
    }
  });

  await t.test('25. Bloco Injetar CSS (inject_css) - Alvos page e injected_component', async () => {
    for (const target of ['page', 'injected_component'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'inj_css',
            type: 'inject_css',
            category: 'injection_customization',
            position: { x: 100, y: 0 },
            data: {
              css: 'body { filter: grayscale(1); }',
              target,
              styleId: 'my-custom-theme',
            },
          },
        ],
        [{ id: 'e1', source: 'start', target: 'inj_css', sourceHandle: 'default' }]
      );

      await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'injectCss');
      assert.equal(call?.args[0], 'body { filter: grayscale(1); }');
      assert.equal(call?.args[1], target);
      assert.equal(call?.args[2], 'my-custom-theme');
    }
  });

  await t.test('26. Bloco Elementos Web (web_component) - Modos shadow_dom e inline', async () => {
    for (const mode of ['shadow_dom', 'inline'] as const) {
      const driver = new MockBrowserDriver();
      const graph = createBaseGraph(
        [
          { id: 'start', type: 'start', category: 'flow_logic', position: { x: 0, y: 0 }, data: { triggerType: 'manual' } },
          {
            id: 'wc',
            type: 'web_component',
            category: 'injection_customization',
            position: { x: 100, y: 0 },
            data: {
              html: '<button id="btnAction">Executar</button>',
              css: 'button { background: purple; color: white; }',
              js: 'document.getElementById("btnAction").onclick = () => alert("ok");',
              containerId: 'automation-floating-widget',
              mode,
            },
          },
        ],
        [{ id: 'e1', source: 'start', target: 'wc', sourceHandle: 'default' }]
      );

      await engine.runGraph(graph, driver);
      const call = driver.calls.find((c) => c.method === 'injectWebComponent');
      assert.equal(call?.args[0], '<button id="btnAction">Executar</button>');
      assert.equal(call?.args[3], 'automation-floating-widget');
      assert.equal(call?.args[4], mode);
    }
  });
});
