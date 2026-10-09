import { useState } from "react";
import { useI18n, useTr } from "@/lib/i18n";
import {
  BookOpen,
  Building2,
  ExternalLink,
  FileText,
  Landmark,
  Library,
  Play,
  TrendingUp,
  Zap,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { eduFor, type Lesson, type LessonLevel } from "@/lib/tcp/education";

const ICONS = {
  trending: TrendingUp,
  building: Building2,
  landmark: Landmark,
  zap: Zap,
  file: FileText,
  library: Library,
};

const LEVEL_TONE: Record<LessonLevel, "gain" | "warn" | "loss" | "accent"> = {
  Básico: "gain",
  Intermediário: "warn",
  Avançado: "loss",
  Todos: "accent",
};

function levelLabel(lv: LessonLevel, tr: ReturnType<typeof useTr>) {
  switch (lv) {
    case "Básico":
      return tr("Básico", "Beginner", "Básico");
    case "Intermediário":
      return tr("Intermediário", "Intermediate", "Intermedio");
    case "Avançado":
      return tr("Avançado", "Advanced", "Avanzado");
    default:
      return tr("Todos", "All", "Todos");
  }
}

export function LearnView() {
  const tr = useTr();
  const { locale } = useI18n();
  const [video, setVideo] = useState<{ title: string; q: string } | null>(null);
  const edu = eduFor(locale);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">{tr("Central de educação", "Learning center", "Centro de aprendizaje")}</h1>
        <p className="mt-1 text-sm text-muted">
          {tr(
            "Conteúdos sobre ativos, títulos, tributação e mercado.",
            "Content on assets, securities, tax, and the market.",
            "Contenido sobre activos, títulos, impuestos y el mercado.",
          )}
        </p>
        <p className="mt-1 text-2xs text-faint">
          {tr(
            "Assistir abre o vídeo dentro do app. Fontes oficiais abrem em nova aba.",
            "Watch opens the video inside the app. Official sources open in a new tab.",
            "Ver abre el video dentro de la app. Las fuentes oficiales se abren en una pestaña nueva.",
          )}
        </p>
      </div>
      {edu.map((cat) => {
        const Icon = ICONS[cat.icon];
        return (
          <section key={cat.cat} className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Icon className="size-4 text-accent" />
              <h2 className="text-sm font-semibold">{cat.cat}</h2>
            </div>
            <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2">
              {cat.items.map((item) => (
                <LessonCard key={item.t} item={item} onWatch={(q) => setVideo({ title: item.t, q })} />
              ))}
            </div>
          </section>
        );
      })}

      {video && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/80 p-4"
          onClick={() => setVideo(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border-strong bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">{video.title}</span>
              <button type="button" className="p-1 text-muted hover:text-fg" onClick={() => setVideo(null)} aria-label={tr("Fechar", "Close", "Cerrar")}>
                <X className="size-4" />
              </button>
            </div>
            <iframe
              className="aspect-video w-full"
              src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(video.q)}&rel=0&modestbranding=1`}
              allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
              allowFullScreen
              title={video.title}
            />
            <div className="border-t border-border px-4 py-2 text-2xs text-faint">
              {tr(
                "Conteúdo externo via YouTube. Anzol não é responsável pelo conteúdo de terceiros.",
                "External content via YouTube. Anzol is not responsible for third-party content.",
                "Contenido externo vía YouTube. Anzol no es responsable del contenido de terceros.",
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LessonCard({ item, onWatch }: { item: Lesson; onWatch: (q: string) => void }) {
  const tr = useTr();
  const ext = item.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(item.q)}`;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-inset p-3.5 transition-colors duration-150 hover:border-accent/40">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold leading-snug">{item.t}</div>
        <Badge tone={LEVEL_TONE[item.lv]}>{levelLabel(item.lv, tr)}</Badge>
      </div>
      <p className="flex-1 text-2xs leading-relaxed text-muted">{item.d}</p>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onWatch(item.q)}
          className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-accent/30 bg-accent/10 text-2xs font-semibold text-accent"
        >
          <Play className="size-3" />
          {tr("Assistir", "Watch", "Ver")}
        </button>
        <a
          href={ext}
          target="_blank"
          rel="noreferrer"
          className="flex size-9 items-center justify-center rounded-lg border border-border text-muted no-underline hover:text-fg"
          aria-label={tr("Abrir fonte", "Open source", "Abrir fuente")}
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

export function LearnHeaderIcon() {
  return <BookOpen className="size-4" />;
}
