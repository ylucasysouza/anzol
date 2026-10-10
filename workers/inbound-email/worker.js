// Cloudflare Email Worker (rota catch-all de n-*@notas.anzol.app via Email Routing).
// Não decodifica MIME (cabe nos 10 ms de CPU do plano grátis): repassa o e-mail bruto,
// assinado com HMAC, para o servidor do Anzol. Sem armazenamento no Cloudflare.
export default {
  async email(message, env) {
    if (!/^n-[a-z0-9]{10,40}@/i.test(message.to)) return message.setReject("Endereço desconhecido");
    if (message.rawSize > 25 * 1024 * 1024) return message.setReject("Mensagem grande demais");
    const raw = new Uint8Array(await new Response(message.raw).arrayBuffer());
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.INBOUND_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, raw))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const res = await fetch(env.ANZOL_INBOUND_URL, {
      method: "POST",
      headers: {
        "content-type": "message/rfc822",
        "x-anzol-signature": sig,
        "x-envelope-from": message.from,
        "x-envelope-to": message.to,
        "x-auth-results": message.headers.get("authentication-results") ?? "",
      },
      body: raw,
    });
    if (res.status === 401 || res.status >= 500) message.setReject("Falha temporária");
  },
};
