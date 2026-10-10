// Só para testes: gera um PDF mínimo e válido com uma linha de texto por linha (WinAnsi).
export function makeTextPdf(lines: string[]): Uint8Array {
  const esc = (s: string) =>
    [...s]
      .map((ch) => {
        const c = ch.charCodeAt(0);
        if (ch === "(" || ch === ")" || ch === "\\") return "\\" + ch;
        if (c > 126) return "\\" + c.toString(8).padStart(3, "0");
        return ch;
      })
      .join("");
  const ops = lines.map((l, i) => `BT /F1 9 Tf 30 ${800 - i * 14} Td (${esc(l)}) Tj ET`).join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.from(ops, "latin1").length} >>\nstream\n${ops}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) body += `${String(off).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, "latin1"));
}
