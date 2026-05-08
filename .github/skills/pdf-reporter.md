# Skill: PDF Reporter

Gera automaticamente um relatório em PDF ao final de cada execução de testes do QAlfred.

## Quando é acionada

A skill é acionada automaticamente pelo runner após a conclusão de todos os cenários.
Não requer chamada manual.

## O que gera

- **Arquivo:** `documentos/Relatorio-<timestamp>.pdf`
- **Formato:** A4, com fundo colorido e margens de 10 mm
- **Um relatório por execução** — o timestamp garante unicidade

## Conteúdo do relatório

| Seção | Descrição |
|---|---|
| Cabeçalho | Título + data/hora da execução |
| Cards de resumo | Total · Passou · Falhou · Taxa de aprovação |
| Tabela de cenários | Feature · Cenário · Duração · Status |
| Detalhes de falha | Passos expandidos apenas nos cenários que falharam, com mensagem de erro |

## Estrutura de dados coletada

Para cada cenário o runner registra:

```js
{
  name: 'Nome do Cenário',
  status: 'passed' | 'failed' | 'blocked',
  duration: 3240,          // ms
  steps: [
    { keyword: 'Dado', text: '...', status: 'passed', error: null },
    { keyword: 'Quando', text: '...', status: 'failed', error: 'mensagem' },
    { keyword: 'Então', text: '...', status: 'skipped', error: null },
  ]
}
```

## Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `src/reporter.js` | Geração do HTML e conversão para PDF via Playwright |
| `src/runner.js` | Coleta resultados e chama `generateReport()` |

## Dependências

Usa o **Playwright** já instalado no projeto (sem dependências extras).
O PDF é gerado com `page.pdf()` usando o mesmo browser Chrome da execução de testes.

## Exemplo de saída

```
📄 Gerando relatório PDF...
✅ Relatório salvo: documentos\Relatorio-2026-05-08_17-46-10.pdf
```
