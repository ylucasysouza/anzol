import { createFileRoute } from "@tanstack/react-router";
import { InstallLanding } from "@/components/tcp/install-landing";

export const Route = createFileRoute("/instalar")({
  component: InstallLanding,
  head: () => ({
    meta: [
      { title: "Instalar Anzol" },
      { property: "og:title", content: "Anzol" },
      { property: "og:description", content: "Patrimônio, orçamento e IR. Instale no celular ou no computador." },
      { property: "og:image", content: "/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
