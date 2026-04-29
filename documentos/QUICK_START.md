# ⚡ Quick Start - QAlfred em 5 Minutos

## Passo 1: Instalar (1 min)

```bash
npm install
npm run setup
```

## Passo 2: Configurar (2 min)

```bash
cp .env.example .env
# Edite .env com seus valores:
# - APP_BASE_URL
# - TEST_USERNAME
# - TEST_PASSWORD
```

## Passo 3: Rodar (1 min)

```bash
# Rodar todos os testes
npm test

# Ou uma feature específica
npm test -- login

# Ou por tag
npm run test:smoke
```

## Passo 4: Ver Resultados (1 min)

Screenshots e relatórios em:
- `screenshots/` — Imagens dos testes
- `reports/` — Relatórios detalhados

---

## 🎯 Próximos Passos

1. **Editar .env** com suas credenciais reais
2. **Rodar um teste**: `npm test -- login`
3. **Checkar screenshots**: `screenshots/*.png`
4. **Criar novos cenários**: Use @test-case-designer

---

## 🆘 Problemas?

| Erro | Solução |
|------|---------|
| "Cannot find module 'playwright'" | `npm install` |
| "No .feature files found" | Verificar `documentos/gherkin/` |
| "Connection refused" | Verificar APP_BASE_URL em `.env` |
| Testes nem abrem browser | `HEADLESS=false npm test` |

---

## 📚 Documentação Completa

Veja [README.md](README.md) para instruções detalhadas.
