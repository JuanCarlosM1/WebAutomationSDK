# 📦 @webautomations/core-sdk (BibliotecaDeDev)

> **Versão:** `0.1.0`  
> **Papel:** Núcleo de Tipagem, SDK Builder e Motor de Execução (Engine) do ecossistema WebAutomations.

---

## 🎯 Visão Geral

O projeto **BibliotecaDeDev** é a espinha dorsal lógica do ecossistema. Ele fornece:
1. **Schema JSON (`.webautomation.json`)**: Especificação formal de nós, arestas, variáveis, gatilhos e configurações de automação.
2. **StateManager**: Gerenciador de contexto, avaliação de expressões, interpolação de variáveis (`{{variavel}}`) e operadores condicionais.
3. **ExecutionEngine**: Orquestrador de execução de grafos de nós com suporte a loops (`while`, `for`), condicionais (`switch`), tratamento de exceções (`try_catch`) e execução paralela ou síncrona.
4. **AutomationBuilder**: Fluent API em TypeScript para criar grafos tipados programaticamente sem necessidade de interface visual.

---

## 🚀 Instalação e Scripts

Dentro do diretório `BibliotecaDeDev`:

```bash
# Instalar dependências
npm install

# Compilar TypeScript para dist/
npm run build

# Observar alterações (watch mode)
npm run watch

# Executar suíte de testes automatizados
npm run test
```

---

## 💻 Uso do SDK (AutomationBuilder)

```typescript
import { AutomationBuilder, ExecutionEngine } from '@webautomations/core-sdk';

// 1. Construir o grafo
const flow = new AutomationBuilder('Buscar Preço de Produto')
  .setVariables({ termo: 'smartphone', precoMin: 1000 })
  .start('manual')
  .navigate('https://loja.exemplo.com')
  .typeText('#search', '{{termo}}')
  .delay({ minMs: 1000, maxMs: 2000 })
  .click('#btn-search')
  .waitForElement('.card-produto', 5000)
  .extractData('.card-preco', 'innerText', 'precoEncontrado')
  .build();

// 2. Exportar como JSON compatível com a Extensão e Servidor MCP
console.log(JSON.stringify(flow, null, 2));
```

---

## 📂 Estrutura do Módulo

```
BibliotecaDeDev/
├── src/
│   ├── engine/
│   │   ├── ExecutionEngine.ts   # Orquestrador de ciclo de vida e nós
│   │   ├── StateManager.ts      # Estado, variáveis e avaliação de operadores
│   │   └── DefaultHandlers.ts   # Handlers padrão para blocos essenciais
│   ├── builder/
│   │   └── AutomationBuilder.ts # Fluent API Builder
│   ├── types/
│   │   └── schema.ts            # Tipagens do formato .webautomation.json
│   ├── test/
│   │   └── AllBlocks.test.ts    # Testes unitários de blocos e operadores
│   └── index.ts                 # Ponto de exportação do pacote
├── examples/                    # Exemplos práticos em JSON e TS
└── package.json                 # Versão 0.1.0
```

---

## 🏷️ Regras de Versionamento

- **Fix (`0.1.x`)**: Incrementado em correções de bugs no motor, tipagens ou handlers existentes.
- **Minor (`0.x.0`)**: Incrementado ao introduzir novos tipos de blocos, novos handlers essenciais ou novas APIs no SDK.
