import { useEffect, useState } from "react";
import type React from "react";
import { cn } from "../utils/cn";

/* ============================================================
   MODULE ISOLÉ — Reveal : déroulé / enroulé fluide d'un bloc.
   · transition de grid-template-rows (0fr → 1fr) + fondu ;
   · « masqué » = réellement absent du DOM (monté à l'ouverture,
     démonté après l'animation de fermeture) ;
   · le débordement n'est coupé que pendant l'animation, pour ne
     pas rogner ombres et anneaux de focus une fois déroulé.
   ============================================================ */
export function Reveal({
  open,
  children,
  id,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  const [render, setRender] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const [settled, setSettled] = useState(open);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;
    if (open) {
      setRender(true);
      // double rAF : laisse le navigateur peindre l'état replié avant de dérouler
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setExpanded(true));
      });
    } else {
      setSettled(false);
      setExpanded(false);
      timer = window.setTimeout(() => setRender(false), 440);
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, [open]);

  if (!render) return null;
  return (
    <div
      id={id}
      className={cn("grid", className)}
      style={{
        gridTemplateRows: expanded ? "1fr" : "0fr",
        opacity: expanded ? 1 : 0,
        transition: "grid-template-rows 420ms cubic-bezier(.2,.8,.2,1), opacity 320ms ease",
      }}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && expanded) setSettled(true);
      }}
    >
      <div className={settled ? "min-h-0" : "min-h-0 overflow-hidden"}>{children}</div>
    </div>
  );
}
