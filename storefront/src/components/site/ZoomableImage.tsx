import { useEffect, useRef, useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Zoom factor on hover (2 = 200%) */
  hoverZoom?: number;
};

/**
 * Product image with cursor-follow magnifier on hover and a fullscreen
 * lightbox that shows the image at its native resolution with pan + zoom.
 */
export function ZoomableImage({ src, alt, className, hoverZoom = 2.2 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);
  const [open, setOpen] = useState(false);

  const onMove = (e: React.MouseEvent) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  return (
    <>
      <div
        ref={wrapRef}
        className={`relative overflow-hidden bg-secondary cursor-zoom-in group ${className ?? ""}`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseMove={onMove}
        onClick={() => setOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 ease-out select-none"
          style={
            hovering
              ? {
                  transform: `scale(${hoverZoom})`,
                  transformOrigin: `${pos.x}% ${pos.y}%`,
                }
              : undefined
          }
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="absolute right-3 top-3 rounded-full bg-background/85 backdrop-blur px-3 py-2 text-[10px] uppercase tracking-widest inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Open full-size image"
        >
          <Maximize2 className="h-3 w-3" /> Full view
        </button>
      </div>

      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const dragging = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(s * 1.25, 8));
      if (e.key === "-") setScale((s) => Math.max(s / 1.25, 0.25));
      if (e.key === "0") { setScale(1); setTx(0); setTy(0); }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    setScale((s) => Math.min(8, Math.max(0.25, s * (delta > 0 ? 1.1 : 0.9))));
  }, []);

  const onDown = (e: React.MouseEvent) => {
    dragging.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setTx(dragging.current.tx + (e.clientX - dragging.current.x));
    setTy(dragging.current.ty + (e.clientY - dragging.current.y));
  };
  const onUp = () => { dragging.current = null; };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onWheel={onWheel}
    >
      {/* Controls */}
      <div
        className="absolute top-4 right-4 z-10 flex items-center gap-2 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setScale((s) => Math.max(s / 1.25, 0.25))}
          className="rounded-full bg-white/10 hover:bg-white/20 p-2.5"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs tabular-nums w-14 text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale((s) => Math.min(s * 1.25, 8))}
          className="rounded-full bg-white/10 hover:bg-white/20 p-2.5"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => { setScale(1); setTx(0); setTy(0); }}
          className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-2 text-[10px] uppercase tracking-widest"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 hover:bg-white/20 p-2.5"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {natural && (
        <div className="absolute bottom-4 left-4 z-10 text-white/60 text-[10px] uppercase tracking-widest">
          {natural.w} × {natural.h}px
        </div>
      )}

      <div
        className="w-full h-full overflow-hidden flex items-center justify-center"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: scale > 1 ? (dragging.current ? "grabbing" : "grab") : "zoom-in" }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragging.current ? "none" : "transform 0.15s ease-out",
            maxWidth: "none",
            maxHeight: "none",
          }}
          className="select-none"
        />
      </div>
    </div>
  );
}
