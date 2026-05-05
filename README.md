# 🚀 QAlfred - End-to-End Test Automation

**QAlfred** é um framework automático de testes E2E que combina a especificação **Gherkin/BDD** com a automação **Playwright**. Executado por dois agentes coordenados:

- **QAlfred**: Executa os testes e gera relatórios

---

## 📋 Pré-requisitos

- **Node.js** v18+ ([Download](https://nodejs.org))
- **npm** (vem com Node.js)
- **VS Code** (recomendado)

---

## 🔧 Instalação Rápida (2 minutos)

### 1. **Instalar Dependências**

```bash
npm install
```

Isso instala:
- ✅ Playwright (automação de browser)
- ✅ Gherkin parser (lê arquivos `.feature`)
- ✅ dotenv (carrega variáveis de ambiente)

### 2. **Configurar Variáveis de Ambiente**

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com seus valores
# Abrir .env e configurar:
# - APP_BASE_URL (URL da aplicação)
# - TEST_USERNAME (usuário de teste)
# - TEST_PASSWORD (senha de teste)
```

### 3. **Setup do Playwright** (Opcional)

```bash
npm run setup

# Isso baixa os navegadores (Chromium, Firefox, WebKit)
```

---

## 🎯 Executar Testes

### **Executar Todos os Testes**

```bash
npm test
```

### **Executar uma Feature Específica**

```bash
npm test -- login

# Ou com caminho completo:
npm test -- documentos/gherkin/login.feature
```

### **Executar por Tag**

```bash
# Apenas testes críticos
npm run test:critical

# Apenas testes de smoke
npm run test:smoke

# Apenas testes de regressão
npm run test:regression
```

### **Executar Todos com Flag Explícito**

```bash
npm run test:all
```

---

## 📊 Estrutura de Saída

```
screenshots/
├── login-Successful_login-2026-04-22T10-30-45.png
├── login-Failed_login-2026-04-22T10-30-50-FAILED.png
├── carrinho-Add_item-2026-04-22T10-31-00.png
└── ...

reports/
├── test-report.json
├── test-report.html
└── summary.txt
```

---

## 🧪 Estrutura de Testes (Gherkin)

### Exemplo: `documentos/gherkin/login.feature`

```gherkin
Feature: User Login
  As a user
  I want to log in securely
  So that I can access my account

  Background:
    Given the login page is loaded

  @critical @smoke
  Scenario: Successful login with valid credentials
    When the user enters valid username
    And the user enters valid password
    And clicks the login button
    Then the dashboard should be displayed

  @regression
  Scenario: Failed login with invalid credentials
    When the user enters invalid username
    And the user enters invalid password
    And clicks the login button
    Then an error message should be shown
```

---

## 🔌 Criar Novos Cenários

Use o **Test Case Designer** agent:

1. Abra VS Code
2. Pressione `Ctrl+Shift+A` (Chat do Copilot)
3. Digite: `@test-case-designer`
4. Descreva a feature que precisa testar

Exemplo:
```
Preciso testar o fluxo de checkout. Deve validar:
- Adicionar produto ao carrinho
- Preencher dados de entrega
- Confirmar pagamento
```

O Test Case Designer criará um arquivo `.feature` com cenários Gherkin prontos!

---

## 🛠️ Configuração Avançada

### **Variáveis de Ambiente** (`.env`)

```env
# Browser Configuration
BROWSER=chromium              # chromium | firefox | webkit
HEADLESS=true                # Rodar em headless mode
SLOW_MO=500                  # Desacelerar ações (ms)
TIMEOUT=30000                # Timeout padrão (ms)

# Screenshots
SCREENSHOT_ON_FAILURE=true   # Capturar screenshot em falhas
SCREENSHOT_ON_SUCCESS=false  # Capturar screenshot em sucessos
SCREENSHOT_FORMAT=png        # png | jpeg

# Reports
REPORT_DIR=./reports         # Diretório de relatórios
GENERATE_HTML=true           # Gerar relatório HTML
```

### **Browsers Suportados**

```bash
# Rodar com Firefox
BROWSER=firefox npm test

# Rodar com WebKit
BROWSER=webkit npm test

# Rodar com Chromium (padrão)
BROWSER=chromium npm test
```

---

## 📈 Relatórios

Após executar testes, os relatórios são gerados em:
- `reports/test-report.json` — Detalhado (máquina-legível)
- `reports/test-report.html` — Visual (browser)
- Console output — Resumo rápido

---

## 🐛 Troubleshooting

### **Erro: "Cannot find module 'playwright'"**
```bash
npm install
```

### **Erro: "Cannot find .feature files"**
Verifique se existem arquivos `.feature` em `documentos/gherkin/`:
```bash
ls documentos/gherkin/
```

### **Testes rodando em modo visual, não headless**
No `.env`, defina:
```env
HEADLESS=true
```

### **Screenshots não estão sendo capturados**
Verifique pasta `screenshots/` existe:
```bash
mkdir -p screenshots
```

---

## 📚 Estrutura do Projeto

```
QAlfred/
├── .github/agents/
│   ├── QAlfred.agent.md              (Agente executor)
│   └── test-case-designer.agent.md   (Agente designer)
├── documentos/gherkin/
│   ├── login.feature
│   ├── cadastro.feature
│   ├── carrinho.feature
│   ├── formulario.feature
│   └── Pesquisa.feature
├── src/
│   └── runner.js                     (Main script)
├── screenshots/                      (Relatórios visuais)
├── reports/                          (Relatórios JSON/HTML)
├── package.json                      (Dependências)
├── .env.example                      (Variáveis de exemplo)
├── .env                              (Variáveis (NÃO comitar))
└── README.md                         (Este arquivo)
```

---

## 🔗 Integrações

### **CI/CD Pipeline**

Adicione isso em seu `.github/workflows/tests.yml`:

```yaml
name: QAlfred Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: screenshots
          path: screenshots/
```

---

## 🚦 Status do Projeto

| Componente | Status |
|------------|--------|
| Agentes de automação | ✅ Pronto |
| Executor de testes | ✅ Pronto |
| Gherkin parser | ✅ Pronto |
| Playwright integration | ✅ Pronto |
| Relatórios | 🟡 Beta |
| CI/CD integration | 🟡 Beta |

---

## 📞 Suporte

Dúvidas or problemas?

1. Verifique o console output
2. Analise os screenshots em `screenshots/`
3. Verifique `.env` está configurado
4. Execute com `VERBOSE=true npm test` para debug

---

## 📝 Licença

MIT

---

**Desenvolvido por**: QAlfred Team  
**Última atualização**: 22 de Abril de 2026  
**Versão**: 1.0.0
