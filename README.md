# QAlfred — End-to-End Test Framework

**QAlfred** é um framework de automação de testes end-to-end construído sobre [Playwright](https://playwright.dev) e o paradigma BDD com especificações em Gherkin. O projeto adota uma arquitetura orientada a agentes para separar as responsabilidades de design de cenários, execução de testes, auditoria de acessibilidade e geração de relatórios.

---

## Arquitetura

O framework é composto por quatro camadas:

| Camada | Responsabilidade |
|--------|-----------------|
| **Agente QAlfred** | Orquestra a execução dos testes e coordena as skills |
| **Test Case Designer** | Gera cenários Gherkin estruturados a partir de descrições funcionais |
| **Accessibility Tester** | Realiza auditorias WCAG 2.1 nos fluxos testados |
| **PDF Reporter** | Consolida os resultados em relatórios HTML e PDF |

O motor de execução (`src/runner.js`) interpreta arquivos `.feature`, lança o navegador via Playwright, executa cada passo sequencialmente com suporte a palavras-chave em português e inglês, captura evidências visuais e alimenta o gerador de relatórios (`src/reporter.js`).

---

## Pré-requisitos

- Node.js v18 ou superior
- npm (distribuído com o Node.js)

---

## Instalação

### 1. Instalar dependências

```bash
npm install
```

Serão instalados:

- `playwright` — automação de navegador
- `@cucumber/gherkin` — parser de arquivos `.feature`
- `dotenv` — gerenciamento de variáveis de ambiente

### 2. Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Aplicação
APP_BASE_URL=https://sua-aplicacao.com
TEST_USERNAME=usuario_de_teste
TEST_PASSWORD=senha_de_teste

# Navegador
BROWSER=chromium          # chromium | firefox | webkit
HEADLESS=true
SLOW_MO=0                 # Atraso entre ações em milissegundos

# Timeouts
TIMEOUT=30000
MAX_TIMEOUT=60000

# Evidências
SCREENSHOT_ON_FAILURE=true
SCREENSHOT_ON_SUCCESS=false

# Relatórios
REPORT_DIR=./documents/reports
GENERATE_HTML=true
```

### 3. Instalar navegadores do Playwright (opcional)

```bash
npm run setup
```

Por padrão, o Chromium já é instalado junto com o Playwright. Este passo baixa também Firefox e WebKit.

---

## Estrutura do Projeto

```
QAlfred/
├── .github/
│   ├── agents/
│   │   └── QAlfred.agent.v2.md        Agente principal de execução
│   └── skills/
│       ├── test-case-designer.md      Gerador de cenários BDD
│       ├── accessibility-tester.md    Auditor WCAG 2.1
│       └── pdf-reporter.md            Gerador de relatórios
├── documents/
│   ├── gherkin/                       Arquivos .feature (entrada)
│   ├── reports/                       Relatórios gerados (PDF/HTML)
│   └── screenshots/                   Evidências de execução
├── src/
│   ├── runner.js                      Motor de execução de testes
│   └── reporter.js                    Gerador de relatórios
├── playwright.config.js
├── package.json
└── .env                               Variáveis de ambiente (não comitar)
```

---

## Executando os Testes

### Todos os testes

```bash
npm test
```

### Feature específica

```bash
npm test -- login
# ou com caminho completo
npm test -- documents/gherkin/auth/login.feature
```

### Por tag

```bash
npm run test:smoke        # Validação rápida — executar a cada deploy
npm run test:critical     # Fluxos críticos de negócio
npm run test:regression   # Cobertura abrangente para releases
npm run test:all          # Todos os testes sem filtro
```

### Selecionando o navegador em tempo de execução

```bash
BROWSER=firefox npm test
BROWSER=webkit npm test
```

---

## Escrevendo Cenários

Os arquivos `.feature` devem ser criados em `documents/gherkin/`. O runner suporta palavras-chave em português (`Dado`, `Quando`, `Então`, `E`) e em inglês (`Given`, `When`, `Then`, `And`).

```gherkin
Feature: Autenticação de usuário

  Background:
    Dado que acesso a url "APP_BASE_URL/login"

  @critical @smoke
  Scenario: Login com credenciais válidas
    Quando preencho o campo "Username" com "TEST_USERNAME"
    E preencho o campo "Password" com "TEST_PASSWORD"
    E clico no botão "Entrar"
    Então sou redirecionado para "/dashboard"

  @regression
  Scenario: Login com credenciais inválidas
    Quando preencho o campo "Username" com "usuario_invalido"
    E preencho o campo "Password" com "senha_invalida"
    E clico no botão "Entrar"
    Então vejo a mensagem de erro "Credenciais inválidas"
```

Valores em maiúsculas correspondentes a variáveis de ambiente (ex.: `TEST_USERNAME`) são substituídos automaticamente pelo runner em tempo de execução.

### Tags disponíveis

| Tag | Propósito |
|-----|-----------|
| `@smoke` | Sanidade básica — executada a cada deploy |
| `@critical` | Fluxos críticos de negócio — bloqueia entrega se falhar |
| `@regression` | Cobertura ampla para ciclos de release |
| `@wip` | Em desenvolvimento — excluída por padrão |
| `@acessibilidade` | Aciona auditoria WCAG 2.1 via `accessibility-tester` |

---

## Agentes

O projeto utiliza três agentes especializados acessíveis via Claude Code:

**Test Case Designer** — Gera arquivos `.feature` a partir de descrições funcionais em linguagem natural. Ao descrever um fluxo, o agente produz cenários BDD estruturados com cenários positivos, negativos e de borda.

**Accessibility Tester** — Executa auditoria de conformidade WCAG 2.1 em cenários marcados com `@acessibilidade`, verificando contraste, navegação por teclado, atributos ARIA e legibilidade.

**PDF Reporter** — Consolida os resultados de execução em relatório PDF (formato A4) com sumário de métricas, detalhamento de falhas e screenshots associadas.

---

## Relatórios

Ao término de cada execução, os relatórios são gerados automaticamente em `documents/reports/`:

- `Relatorio-{timestamp}.pdf` — Relatório imprimível com sumário visual
- `Relatorio-{timestamp}.html` — Versão interativa para navegador

O console exibe um sumário imediato com total de cenários, aprovados, reprovados e taxa de sucesso.

As evidências visuais são organizadas em `documents/screenshots/{timestamp}/{nome-do-cenario}/`.

---

## Troubleshooting

**`Cannot find module 'playwright'`**
Execute `npm install` para restaurar as dependências.

**Nenhum arquivo `.feature` encontrado**
Verifique se existem arquivos `.feature` em `documents/gherkin/`. O diretório deve conter pelo menos um arquivo para o runner iniciar a execução.

**Testes executando em modo visual (não headless)**
Defina `HEADLESS=true` no arquivo `.env`.

**Variáveis de ambiente não resolvidas nos passos**
Confirme que o arquivo `.env` existe na raiz do projeto e que as variáveis estão escritas em maiúsculas no passo Gherkin.
---

Desenvolvido por Hebert Jesus
