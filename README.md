# Anzol

Este repositório **é o aplicativo Anzol**, como está agora. Não é um resumo, não é uma página de instalação e não é um briefing.

https://github.com/ylucasysouza/anzol

## Para um bot do Grok

Clone este repositório e edite os arquivos. O app mora em `src/`. Você pode mudar o projeto como quiser.

Não crie outro aplicativo do zero. Não trate um arquivo `.md` ou um `Anzol.html` como se fosse o produto. O produto é este código.

```bash
npm install
npm run dev
```

O servidor de desenvolvimento escuta na porta 8080.

## O que não apagar sem pedido

- O livro abre neste aparelho na hora. A nuvem só sincroniza em segundo plano. Um aparelho vazio não pode apagar um livro que já tem lançamentos.
- Não invente chave PIX, URL de checkout nem cobrança. Os links de pagamento estão vazios de propósito.
- Em tela fiscal, mantenha: "Ferramenta de organização e cálculo. Valide com contador. Regras mudam por país e por operação."
- Não esconda "Created with Grok".
- Não peça para reinstalar o ícone do iPhone. A letra da tela de início não muda sozinha.

## Onde mexer

| Pasta | O que é |
|---|---|
| `src/components/tcp/` | Telas do app |
| `src/lib/tcp/` | Livro, planos, apuração, sincronização |
| `src/lib/casa/` | Orçamento da casa |
| `src/lib/i18n.tsx` | Português, inglês e espanhol |
| `migrations/` | Tabelas (conta, livro, leads, planos) |
