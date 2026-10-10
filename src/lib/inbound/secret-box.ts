/**
 * Criptografia de segredos do usuário (senha do PDF da nota) com AES-256-GCM.
 * Chave: ANZOL_PDF_KEY (32 bytes em base64) — só no servidor, nunca no repositório.
 * O userId entra como "dado associado": o texto cifrado de um usuário não abre para outro.
 * Formato: "v1.<iv b64>.<cifra+tag b64>". Nunca registrar (log) o texto aberto.
 */
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));

async function importKey(keyB64: string | undefined): Promise<CryptoKey> {
  if (!keyB64) throw new Error("ANZOL_PDF_KEY não configurada");
  const raw = unb64(keyB64);
  if (raw.byteLength !== 32) throw new Error("ANZOL_PDF_KEY precisa ter 32 bytes (base64)");
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealSecret(plain: string, userId: string, keyB64: string | undefined): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(userId) },
    key,
    new TextEncoder().encode(plain),
  );
  return `v1.${b64(iv)}.${b64(new Uint8Array(ct))}`;
}

export async function openSecret(sealed: string, userId: string, keyB64: string | undefined): Promise<string> {
  const [v, iv, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !ct) throw new Error("formato inválido");
  const key = await importKey(keyB64);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv) as BufferSource, additionalData: new TextEncoder().encode(userId) },
    key,
    unb64(ct) as BufferSource,
  );
  return new TextDecoder().decode(pt);
}
