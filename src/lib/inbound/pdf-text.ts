/**
 * Extrai o texto de um PDF de nota, linha a linha (agrupa itens pela altura Y),
 * no formato que o parser SINACOR espera. Roda no servidor (unpdf = pdf.js sem DOM).
 * PDF escaneado (só imagem) devolve texto vazio: precisa de OCR (fora do escopo).
 */
export class PdfPasswordError extends Error {
  reason: "missing" | "wrong";
  constructor(reason: "missing" | "wrong") {
    super(reason === "missing" ? "PDF protegido por senha" : "Senha do PDF incorreta");
    this.reason = reason;
    this.name = "PdfPasswordError";
  }
}

/** pdf.js abre PDFs cifrados (RC4/AES-128/AES-256) quando recebe a senha. */
export async function pdfToLines(pdf: Uint8Array, password?: string): Promise<string> {
  const { getDocumentProxy } = await import("unpdf");
  let doc: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    doc = await getDocumentProxy(new Uint8Array(pdf), (password ? { password } : {}) as never);
  } catch (e) {
    if ((e as Error)?.name === "PasswordException") {
      throw new PdfPasswordError((e as { code?: number }).code === 2 ? "wrong" : "missing");
    }
    throw e;
  }
  const out: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const rows = new Map<number, { x: number; s: string }[]>();
      for (const it of content.items as Array<{ str?: string; transform?: number[] }>) {
        if (!it.str || !it.transform) continue;
        const y = Math.round(it.transform[5] / 2) * 2; // tolerância de 2pt
        const row = rows.get(y) ?? [];
        row.push({ x: it.transform[4], s: it.str });
        rows.set(y, row);
      }
      for (const y of [...rows.keys()].sort((a, b) => b - a)) {
        out.push(
          rows
            .get(y)!
            .sort((a, b) => a.x - b.x)
            .map((r) => r.s)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        );
      }
    }
  } finally {
    await (doc as { destroy?: () => Promise<void> }).destroy?.();
  }
  return out.join("\n");
}
