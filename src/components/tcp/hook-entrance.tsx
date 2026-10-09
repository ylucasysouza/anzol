import { useEffect, useState } from "react";
import { useTr } from "@/lib/i18n";

const KEY = "anzol-hook-in";
const SHOW_MS = 1100;

let closed = false;
let armed = false;
const listeners = new Set<() => void>();

function seenAlready(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function closeHook() {
  if (closed) return;
  closed = true;
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode */
  }
  listeners.forEach((fn) => fn());
}

function armHook() {
  if (armed || closed) return;
  armed = true;
  if (seenAlready()) {
    closed = true;
    return;
  }
  window.setTimeout(closeHook, SHOW_MS);
}

export function HookEntrance() {
  const tr = useTr();
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(!closed);
    listeners.add(sync);
    armHook();
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  if (!on || closed) return null;

  return (
    <button
      type="button"
      className="hook-in"
      aria-label={tr("Entrar no Anzol", "Enter Anzol", "Entrar a Anzol")}
      onClick={closeHook}
    >
      {[
        { size: 14, left: "22%", top: "30%", delay: "0s" },
        { size: 26, left: "70%", top: "26%", delay: "0.15s" },
        { size: 18, left: "78%", top: "48%", delay: "0.4s" },
        { size: 10, left: "30%", top: "58%", delay: "0.25s" },
        { size: 34, left: "16%", top: "46%", delay: "0.55s" },
        { size: 12, left: "62%", top: "64%", delay: "0.1s" },
        { size: 20, left: "48%", top: "22%", delay: "0.7s" },
        { size: 8, left: "40%", top: "70%", delay: "0.35s" },
      ].map((b) => (
        <span
          key={b.left + b.top}
          className="hook-bubble"
          style={{ width: b.size, height: b.size, left: b.left, top: b.top, animationDelay: b.delay }}
        />
      ))}
      <span className="hook-stage">
        <img src="/icon-192.png?v=5" alt="" className="hook-mark" />
        <span className="hook-word">Anzol</span>
      </span>
    </button>
  );
}
