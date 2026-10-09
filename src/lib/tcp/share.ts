import { downloadText } from "./csv";

/** Public source. Other Grok bots clone this and edit the app. Not an install link. */
export const PROJECT_URL = "https://github.com/ylucasysouza/anzol";

export async function shareProject(): Promise<"shared" | "copied" | "failed"> {
  const payload = {
    title: "Anzol — código do projeto",
    text: "Este é o código do Anzol, como está. Clone e edite o repositório. Não invente outro app. Não é resumo nem link de instalação.",
    url: PROJECT_URL,
  };
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return "failed";
    }
  }
  try {
    await navigator.clipboard.writeText(PROJECT_URL);
    return "copied";
  } catch {
    return "failed";
  }
}

export function installPageUrl(): string {
  const url = new URL(window.location.href);
  url.pathname = "/instalar";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export async function copyInstallLink(): Promise<boolean> {
  const link = installPageUrl();
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

export async function shareInstallLink(): Promise<"shared" | "copied" | "failed"> {
  const link = installPageUrl();
  const payload = {
    title: "Anzol",
    text: "Instale o Anzol — patrimônio, orçamento e IR.",
    url: link,
  };
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return "failed";
    }
  }
  return (await copyInstallLink()) ? "copied" : "failed";
}

export async function downloadInstallFile(): Promise<void> {
  const link = installPageUrl();
  const res = await fetch("/icon-512.png");
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("icon"));
    reader.readAsDataURL(blob);
  });
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="refresh" content="0;url=${link}"/>
<title>Abrir Anzol</title>
<script>location.replace(${JSON.stringify(link)});</script>
</head>
<body style="margin:0;background:#070c14;color:#e8edf5;font-family:Georgia,serif">
  <main style="max-width:420px;margin:0 auto;padding:48px 24px;text-align:center">
    <img src="${dataUrl}" alt="Anzol" width="168" height="168" style="border-radius:28px"/>
    <p style="letter-spacing:.28em;font-size:22px;margin:28px 0 8px">ANZOL</p>
    <p style="color:#9aa3b0;font-family:sans-serif;font-size:15px;line-height:1.5">Este arquivo não instala. Ele abre o Anzol no navegador. O ícone de instalar fica no fim da barra de endereço dessa página — não aqui.</p>
    <a href="${link}" style="display:inline-block;margin-top:28px;background:#c6a56a;color:#070c14;text-decoration:none;font-family:sans-serif;font-weight:700;padding:14px 22px;border-radius:12px">Abrir o Anzol</a>
  </main>
</body>
</html>`;
  downloadText("Anzol.html", html, "text/html");
}

export const GROK_BOT_BRIEF = `Anzol — briefing para bots do Grok

Você está recebendo o produto Anzol. Não invente outro app. Continue este.

O que é
- Aplicativo de organização financeira e apuração, instalável no celular e no computador.
- Marca: anzol geométrico com baleia, noite oceânica, azul-marinho. Sem neon, sem roxo, sem dourado, sem degradê, sem emoji.
- Idiomas do produto inteiro: português (Brasil), inglês e espanhol da América Latina. Nomes fiscais brasileiros (DARF, DIRPF, CPF, B3, IRRF, PTAX) permanecem e ganham uma explicação curta.
- Cada pessoa tem a própria conta. Apagar o ícone num aparelho não apaga a conta de outra pessoa.
- O livro abre na hora, neste aparelho. A nuvem sincroniza em segundo plano quando a mesma conta está em mais de um aparelho. Um aparelho vazio não pode apagar um livro que já tem dados.

Quem usa agora
- O dono do produto, neste aparelho que já guarda o livro, tem acesso de desenvolvedor: todos os planos, sem cobrança.
- Um aparelho novo começa no Free. Cliente paga e recebe só o plano pago.
- Não existe período de teste.

Planos (preço em real)
- Free, R$ 0: day trade e swing, lançamento manual e CSV, exportação CSV, 1 conta, histórico de 90 dias, aviso de que o chat é IA. Sem gastos da casa, fluxo de caixa, API, DRE, balanço, investimentos, opções por corretora, multi-país além do Brasil padrão.
- Pro, R$ 459 por mês ou R$ 4.590 por ano: tudo do Free, mais gastos da conta, fluxo de caixa, até 3 contas, histórico de 24 meses, alerta de DARF estimado sem emitir guia oficial, PDF e CSV para o contador, 1 usuário. Sem API, sem DRE, sem balanço, sem mapa de investimentos.
- Baleia, R$ 999 por mês ou R$ 9.990 por ano: tudo do Pro, mais API só de leitura, DRE gerencial, balanço gerencial, investimentos, opções por corretora, multi-país com estimativa editável, até 10 contas, histórico sem limite, até 3 usuários, fila de suporte em horário comercial.
- Enterprise, a partir de R$ 2.990 por mês, sob consulta, sem checkout automático: tudo da Baleia, mais API de leitura e escrita, webhooks, SSO opcional, white-label leve, auditoria em lote, onboarding e canal humano dedicado, contrato e nota da empresa. Não prometa residência de dados nem regulação da CVM.

Pagamento
- PIX ou Mercado Pago da empresa. Um link por plano: Pro mensal, Pro anual, Baleia mensal, Baleia anual.
- Os links ainda estão vazios. Não invente chave PIX, URL nem cobrança. O botão só abre um link quando ele existir. Enquanto estiver vazio, avise que nada foi cobrado.
- Libera o plano só depois de pagamento confirmado (payment.approved ou pix.received).
- Upgrade vale quando o pagamento confirma. Downgrade só no fim do período já pago. A pessoa pode cancelar e segue até o fim do ciclo.
- Enterprise é um formulário (nome, e-mail, telefone, empresa e mensagem) para vendas, não um checkout.

O que nunca prometer
- Economia de imposto, restituição ou ganho.
- DARF oficial, apuração garantida ou certeza de que está tudo correto.
- Suporte ilimitado.
- Em toda tela fiscal, mantenha esta frase em português e a tradução fiel: "Ferramenta de organização e cálculo. Valide com contador. Regras mudam por país e por operação."
- O chat é IA, não um contador. Time humano em horário comercial é da Baleia. Canal dedicado é do Enterprise.

O que não fazer
- Não trave a abertura. O livro aparece. A animação do anzol, se existir, some sozinha e também fecha no toque.
- Não apague meses fora da janela do plano. Eles continuam salvos.
- Não peça para reinstalar o ícone do iPhone. A letra A da tela de início não muda sozinha.
- Não esconda a marca "Created with Grok".
`;

export function downloadGrokBrief(): void {
  downloadText("Anzol-para-bots-do-Grok.md", GROK_BOT_BRIEF, "text/markdown");
}
