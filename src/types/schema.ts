/**
 * WebAutomations Core Schema & Types
 * Definições formais para o formato de grafo .webautomation.json
 */

export type NodeCategory =
  | 'flow_logic'
  | 'browser_navigation'
  | 'dom_interaction'
  | 'data_network'
  | 'injection_customization';

export type NodeType =
  // A. Controle de Fluxo e Lógica
  | 'start'
  | 'delay'
  | 'switch'
  | 'while_loop'
  | 'for_loop'
  | 'group'
  | 'if_element_exists'
  | 'try_catch'
  // B. Navegação (Browser API)
  | 'navigate'
  | 'tab_action'
  | 'history_navigation'
  // C. Interação com a Página (DOM)
  | 'click_element'
  | 'type_input'
  | 'press_key'
  | 'hover_focus'
  | 'scroll'
  | 'wait_for_element'
  // D. Dados, Variáveis e Rede
  | 'http_request'
  | 'set_variable'
  | 'extract_data'
  | 'scrape_list'
  | 'export_file'
  // E. Injeção e Customização
  | 'inject_javascript'
  | 'inject_html'
  | 'inject_css'
  | 'web_component'
  | 'note';

export type SelectorType = 'css' | 'xpath';

export interface Position {
  x: number;
  y: number;
}

export interface NodeDimensions {
  width?: number;
  height?: number;
}

// -------------------------------------------------------------
// DADOS ESPECÍFICOS DE CADA NÓ (Node Data Payloads)
// -------------------------------------------------------------

// A. Controle de Fluxo e Lógica

export type TriggerType =
  | 'manual'
  | 'on_url_load'
  | 'shortcut'
  | 'mcp'
  | 'schedule'
  | 'browser_startup'
  | 'context_menu'
  | 'floating_button';

export interface FloatingButtonConfig {
  buttonText?: string;
  iconType?: 'emoji' | 'svg' | 'image';
  buttonIcon?: string; // ex: ⚡, 🚀, ▶ para emoji
  svgIcon?: string; // código SVG (ex: <svg ...>...</svg>)
  imageIcon?: string; // Data URL base64 ou URL da imagem
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  offsetX?: number; // em px
  offsetY?: number; // em px
  backgroundColor?: string;
  textColor?: string;
  urlPattern?: string; // páginas onde o botão deve ser injetado (ex: *://*/*)
}

export interface TriggerConfig {
  type: TriggerType;
  enabled?: boolean;
  urlPattern?: string; // Mantido para compatibilidade (única URL)
  urlPatterns?: string[]; // Lista de múltiplas URLs de execução
  shortcutKey?: string; // Para atalho (ex: Ctrl+Shift+U)
  intervalMinutes?: number; // Para schedule (ex: 15)
  cronExpression?: string; // Para schedule avançado (ex: "0 * * * *")
  contextMenuTitle?: string; // Para context_menu (ex: "Executar Fluxo")
  floatingButton?: FloatingButtonConfig; // Para floating_button
}

export interface StartNodeData {
  label?: string;
  triggerType?: TriggerType; // Compatibilidade com versões anteriores
  triggers?: TriggerConfig[]; // Múltiplas formas simultâneas de executar o fluxo
  urlPattern?: string;
  urlPatterns?: string[];
  shortcutKey?: string;
  intervalMinutes?: number;
  cronExpression?: string;
  contextMenuTitle?: string;
  floatingButton?: FloatingButtonConfig;
  description?: string;
}

/**
 * Retorna a lista normalizada de padrões de URLs para execução de um gatilho
 */
export function getTriggerUrlPatterns(trigger?: { urlPattern?: string; urlPatterns?: string[]; floatingButton?: FloatingButtonConfig }): string[] {
  if (!trigger) return [];
  const list: string[] = [];

  if (Array.isArray(trigger.urlPatterns) && trigger.urlPatterns.length > 0) {
    list.push(...trigger.urlPatterns.map((u) => u.trim()).filter((u) => u.length > 0));
  } else if (trigger.urlPattern && trigger.urlPattern.trim()) {
    list.push(trigger.urlPattern.trim());
  }

  // Se for floating button com urlPattern próprio
  if (trigger.floatingButton?.urlPattern && trigger.floatingButton.urlPattern.trim()) {
    if (!list.includes(trigger.floatingButton.urlPattern.trim())) {
      list.push(trigger.floatingButton.urlPattern.trim());
    }
  }

  return list.length > 0 ? list : [];
}

/**
 * Normaliza os gatilhos de um StartNodeData para retornar uma lista uniforme de TriggerConfig ativos
 */
export function getActiveTriggers(data?: StartNodeData): TriggerConfig[] {
  if (!data) return [{ type: 'manual', enabled: true }];

  // Se já possui a lista de múltiplos gatilhos configurada
  if (Array.isArray(data.triggers) && data.triggers.length > 0) {
    return data.triggers.filter((t) => t.enabled !== false);
  }

  // Fallback para formato legado de gatilho único
  const singleType = data.triggerType || 'manual';
  return [
    {
      type: singleType,
      enabled: true,
      urlPattern: data.urlPattern,
      urlPatterns: data.urlPatterns || (data.urlPattern ? [data.urlPattern] : undefined),
      shortcutKey: data.shortcutKey,
      intervalMinutes: data.intervalMinutes,
      cronExpression: data.cronExpression,
      contextMenuTitle: data.contextMenuTitle,
      floatingButton: data.floatingButton,
    },
  ];
}

export interface DelayNodeData {
  label?: string;
  isRandom: boolean;
  fixedMs?: number; // Ex: 1000
  randomRange?: {
    minMs: number;
    maxMs: number;
  }; // Ex: min 1000ms, max 2000ms
}

export type SwitchOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'regex_match';

export type ConditionEvaluationMode = 'comparison' | 'js_eval';

export interface SwitchCase {
  id: string; // ID do handle de saída correspondente
  evaluationMode?: ConditionEvaluationMode; // 'comparison' ou 'js_eval'
  jsExpression?: string; // Expressão ou código JS booleano (ex: "user.age >= 18 && user.active")
  leftOperand?: string; // Variável ou expressão (ex: "{{status}}")
  operator?: SwitchOperator;
  rightOperand?: string; // Valor de comparação (ex: "200")
  label?: string;
}

export type SwitchExecutionMode = 'first_match' | 'all_matches_parallel';

export interface SwitchNodeData {
  label?: string;
  executionMode: SwitchExecutionMode;
  cases: SwitchCase[];
  hasDefaultBranch: boolean;
  description?: string;
}

export interface WhileLoopNodeData {
  label?: string;
  evaluationMode?: ConditionEvaluationMode; // 'comparison' ou 'js_eval'
  jsExpression?: string; // Expressão ou código JS que retorna boolean
  leftOperand?: string;
  operator?: SwitchOperator;
  rightOperand?: string;
  maxIterations?: number; // Prevenção de loop infinito
  description?: string;
}

export type ForLoopType = 'count' | 'array' | 'js_generator';

export interface ForLoopNodeData {
  label?: string;
  loopType: ForLoopType;
  countExpression?: number | string; // Ex: 5 ou "{{totalItems}}"
  arrayExpression?: string; // Ex: "{{usersList}}"
  jsExpression?: string; // Código/Expressão JS que retorna array ou número de repetições
  itemVarName: string; // Nome da variável do item atual (ex: "currentUser")
  indexVarName: string; // Nome da variável do índice atual (ex: "index")
  maxIterations?: number;
  description?: string;
}

export interface GroupNodeData {
  label: string;
  color?: string;
  childNodeIds: string[];
  description?: string;
  collapsed?: boolean;
}

export interface IfElementExistsNodeData {
  label?: string;
  selector: string;
  selectorType: SelectorType;
  timeoutMs?: number; // Tempo máximo para verificar existência antes de considerar falso
}

export interface TryCatchNodeData {
  label?: string;
  errorVarName?: string; // Onde armazenar a mensagem/objeto de erro no catch (ex: "lastError")
}

// B. Navegação (Browser API)

export type WaitUntilCondition = 'load' | 'domcontentloaded' | 'networkidle' | 'none';

export interface NavigateNodeData {
  label?: string;
  url: string; // Suporta interpolação {{urlVar}}
  waitUntil: WaitUntilCondition;
  timeoutMs?: number;
}

export type TabActionType = 'new_tab' | 'switch_tab' | 'close_tab' | 'get_current_url';
export type TabQueryType = 'title' | 'index' | 'url_match';

export interface TabActionNodeData {
  label?: string;
  action: TabActionType;
  url?: string; // Para new_tab
  queryType?: TabQueryType; // Para switch_tab ou close_tab
  queryValue?: string | number; // Título, índice ou regex da URL
  saveUrlToVar?: string; // Para get_current_url
  active?: boolean; // Para new_tab (se deve focar imediatamente)
}

export type HistoryActionType = 'back' | 'forward' | 'reload';

export interface HistoryNavigationNodeData {
  label?: string;
  action: HistoryActionType;
  ignoreCache?: boolean; // Para reload
}

// C. Interação com a Página (DOM)

export type ClickType = 'single' | 'double' | 'contextmenu';

export interface ClickElementNodeData {
  label?: string;
  selector: string;
  selectorType: SelectorType;
  clickType: ClickType;
  waitForElement?: boolean;
  timeoutMs?: number;
  clickCoordinates?: { x: number; y: number }; // Opcional: clique relativo dentro do elemento
}

export type TypingMode = 'human_typing' | 'paste';

export interface TypeInputNodeData {
  label?: string;
  selector: string;
  selectorType: SelectorType;
  text: string; // Suporta interpolação {{var}}
  mode: TypingMode;
  minTypingDelayMs?: number; // Ex: 50ms
  maxTypingDelayMs?: number; // Ex: 150ms
  clearBeforeTyping?: boolean;
  pressEnterAfter?: boolean;
  timeoutMs?: number;
}

export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

export interface PressKeyNodeData {
  label?: string;
  key: string; // Ex: "Enter", "Escape", "Tab", "ArrowDown", "a"
  modifiers?: ModifierKey[];
  selector?: string; // Opcional: focar no elemento antes de pressionar
  selectorType?: SelectorType;
}

export interface HoverFocusNodeData {
  label?: string;
  selector: string;
  selectorType: SelectorType;
  action: 'hover' | 'focus';
  timeoutMs?: number;
}

export type ScrollTarget = 'top' | 'bottom' | 'element' | 'by_pixels';

export interface ScrollNodeData {
  label?: string;
  target: ScrollTarget;
  selector?: string;
  selectorType?: SelectorType;
  deltaX?: number;
  deltaY?: number;
  smooth?: boolean;
}

export type ElementWaitState = 'visible' | 'hidden' | 'clickable' | 'attached';

export interface WaitForElementNodeData {
  label?: string;
  selector: string;
  selectorType: SelectorType;
  state: ElementWaitState;
  timeoutMs: number;
}

// D. Dados, Variáveis e Rede

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export interface HttpRequestNodeData {
  label?: string;
  url: string; // Suporta {{endpoint}}
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string; // JSON string ou texto bruto (com interpolação)
  responseType?: 'json' | 'text' | 'blob';
  saveResponseToVar: string;
  saveStatusToVar?: string;
  saveHeadersToVar?: string;
  timeoutMs?: number;
}

export type VariableEvaluationType = 'literal' | 'template' | 'js_eval';

export interface SetVariableNodeData {
  label?: string;
  varName: string;
  evaluationType: VariableEvaluationType;
  valueExpression: any; // Valor literal, template "{{varA}} + {{varB}}" ou código JS "Number({{x}}) * 2"
}

export type ExtractionType = 'innerText' | 'innerHTML' | 'attribute' | 'value';

export interface ExtractDataNodeData {
  label?: string;
  selector: string;
  selectorType: SelectorType;
  extractType: ExtractionType;
  attributeName?: string; // Necessário quando extractType == 'attribute' (ex: "href", "src")
  saveToVar: string;
  timeoutMs?: number;
}

export interface ScrapeFieldDefinition {
  name: string; // Chave no objeto resultante
  subSelector?: string; // Seletor relativo ao elemento item (ou vazio para o próprio elemento)
  selectorType?: SelectorType;
  extractType: ExtractionType;
  attributeName?: string;
}

export interface ScrapeListNodeData {
  label?: string;
  selector: string; // Seletor do container de itens ou dos itens
  selectorType: SelectorType;
  fields: ScrapeFieldDefinition[];
  saveToVar: string;
  maxItems?: number;
  timeoutMs?: number;
}

export type ExportFileFormat = 'json' | 'csv';

export interface ExportFileNodeData {
  label?: string;
  sourceVar: string; // Nome da variável que contém o Array ou Objeto
  format: ExportFileFormat;
  filename: string; // Nome sugerido do arquivo (suporta {{data}}.csv)
  csvDelimiter?: string; // Default: ","
}

// E. Injeção e Customização

export type ScriptExecutionContext = 'content_script' | 'background';

export interface InjectJavascriptNodeData {
  label?: string;
  code: string; // Código JS a ser executado
  context: ScriptExecutionContext;
  args?: string[]; // Variáveis do estado passadas como argumentos
  saveResultToVar?: string;
}

export type DomInsertPosition = 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';

export interface InjectHtmlNodeData {
  label?: string;
  html: string;
  targetSelector: string;
  selectorType?: SelectorType;
  position: DomInsertPosition;
}

export interface InjectCssNodeData {
  label?: string;
  css: string;
  target: 'page' | 'injected_component';
  styleId?: string; // ID da tag <style> para permitir remoção/atualização posterior
}

export interface WebComponentNodeData {
  label?: string;
  html: string;
  css: string;
  js: string;
  containerId: string;
  mode: 'shadow_dom' | 'inline';
}

export interface NoteNodeData {
  label?: string;
  content: string;
  color?: string; // Cor de fundo do cartão de anotação
}

// -------------------------------------------------------------
// MAPA DE TIPO PARA DADOS (Discriminated Unions)
// -------------------------------------------------------------

export interface NodeDataMap {
  start: StartNodeData;
  delay: DelayNodeData;
  switch: SwitchNodeData;
  while_loop: WhileLoopNodeData;
  for_loop: ForLoopNodeData;
  group: GroupNodeData;
  if_element_exists: IfElementExistsNodeData;
  try_catch: TryCatchNodeData;
  navigate: NavigateNodeData;
  tab_action: TabActionNodeData;
  history_navigation: HistoryNavigationNodeData;
  click_element: ClickElementNodeData;
  type_input: TypeInputNodeData;
  press_key: PressKeyNodeData;
  hover_focus: HoverFocusNodeData;
  scroll: ScrollNodeData;
  wait_for_element: WaitForElementNodeData;
  http_request: HttpRequestNodeData;
  set_variable: SetVariableNodeData;
  extract_data: ExtractDataNodeData;
  scrape_list: ScrapeListNodeData;
  export_file: ExportFileNodeData;
  inject_javascript: InjectJavascriptNodeData;
  inject_html: InjectHtmlNodeData;
  inject_css: InjectCssNodeData;
  web_component: WebComponentNodeData;
  note: NoteNodeData;
}

// -------------------------------------------------------------
// ESTRUTURA GENÉRICA E ESPECÍFICA DO NÓ NO GRAFO
// -------------------------------------------------------------

export interface AutomationNode<T extends NodeType = NodeType> {
  id: string;
  type: T;
  position: Position;
  dimensions?: NodeDimensions;
  category: NodeCategory;
  data: NodeDataMap[T];
  disabled?: boolean;
}

export type AnyAutomationNode = {
  [K in NodeType]: AutomationNode<K>;
}[NodeType];

// Handles conhecidos para ramificações condicionais
export type HandleType =
  | 'default'
  | 'true'
  | 'false'
  | 'loop_body'
  | 'loop_done'
  | 'try_body'
  | 'catch_branch'
  | string; // Para IDs de cases dinâmicos no Switch

export interface AutomationEdge {
  id: string;
  source: string; // ID do nó de origem
  target: string; // ID do nó de destino
  sourceHandle?: HandleType;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
}

// -------------------------------------------------------------
// ESQUEMA COMPLETO DO ARQUIVO .webautomation.json
// -------------------------------------------------------------

export interface AutomationMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  tags?: string[];
}

export interface AutomationSettings {
  stopOnError?: boolean;
  defaultTimeoutMs?: number;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  parallelBranchesEnabled?: boolean;
  colorPalette?: string[]; // Grupo de cores personalizadas do fluxo acessíveis em todo o editor
}

export interface ViewportSettings {
  x: number;
  y: number;
  zoom: number;
}

export interface WebAutomationGraph {
  schemaVersion: '1.0.0';
  metadata: AutomationMetadata;
  settings: AutomationSettings;
  variables: Record<string, any>; // Variáveis iniciais/ambiente
  colorPalette?: string[]; // Paleta de cores personalizada global do fluxo
  nodes: AnyAutomationNode[];
  edges: AutomationEdge[];
  viewport?: ViewportSettings;
}
