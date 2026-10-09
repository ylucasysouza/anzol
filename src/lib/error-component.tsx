import { Component, type ReactNode } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useTr } from "@/lib/i18n";

function RescueScreen() {
  const tr = useTr();
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#070c14",
        color: "#e8edf5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        fontFamily: "Georgia, serif",
      }}
    >
      <img src="/apple-touch-icon.png?v=5" alt="" width={72} height={72} style={{ borderRadius: 16 }} />
      <h1 style={{ fontSize: 22, letterSpacing: "0.18em", margin: 0 }}>ANZOL</h1>
      <p style={{ maxWidth: 320, fontFamily: "sans-serif", fontSize: 15, lineHeight: 1.5, color: "#9aa3b0", margin: 0 }}>
        {tr(
          "O login não entrou. Os dados das contas continuam neste aparelho. Entre de novo por aqui.",
          "Sign-in did not complete. Your books are still on this device. Sign in again here.",
          "El ingreso no se completó. Los datos siguen en este dispositivo. Entra de nuevo aquí.",
        )}
      </p>
      <a
        href="/"
        style={{
          background: "#c6a56a",
          color: "#070c14",
          textDecoration: "none",
          fontFamily: "sans-serif",
          fontWeight: 700,
          padding: "12px 18px",
          borderRadius: 12,
        }}
      >
        {tr("Abrir o app", "Open the app", "Abrir la app")}
      </a>
      <a href="/login" style={{ color: "#c6a56a", fontFamily: "sans-serif", fontSize: 15 }}>
        {tr("Entrar de novo", "Sign in again", "Entrar de nuevo")}
      </a>
    </main>
  );
}

export function AppErrorComponent(_props: ErrorComponentProps) {
  return <RescueScreen />;
}

export class RescueBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <RescueScreen />;
    return this.props.children;
  }
}
