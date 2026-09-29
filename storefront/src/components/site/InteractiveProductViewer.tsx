import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, RotateCcw, Camera, X, Images, Sparkles } from "lucide-react";
import { ZoomableImage } from "./ZoomableImage";

/**
 * Interactive Product Experience
 * Tabs: Studio (wall/lighting swatches on cutout) · Photos (real gallery) · 360° (drag rotate) · AR (camera overlay)
 *
 * The gallery is NEVER hidden — Photos tab always exposes every uploaded image.
 */

type Scene = { label: string; url: string };
type GalleryItem = { url: string; label?: string };

type Props = {
  productName: string;
  cutoutUrl: string | null;
  gallery: GalleryItem[];
  fallbackUrl: string;
  scenes?: Scene[];
  specs?: Record<string, string>;
};

type Swatch = { key: string; label: string; background: string };

const WALL_SWATCHES: Swatch[] = [
  { key: "white", label: "White Wall", background: "linear-gradient(180deg, #F8F6F1 0%, #EDE9E1 100%)" },
  { key: "beige", label: "Beige", background: "linear-gradient(180deg, #E9DFCE 0%, #D6C8B0 100%)" },
  { key: "concrete", label: "Concrete", background: "linear-gradient(180deg, #C9C6C0 0%, #A6A29A 100%)" },
  { key: "walnut", label: "Walnut", background: "linear-gradient(180deg, #7A5236 0%, #5A3A22 100%)" },
  { key: "oak", label: "Oak", background: "linear-gradient(180deg, #C9A277 0%, #A8814F 100%)" },
  { key: "black", label: "Black", background: "linear-gradient(180deg, #22201E 0%, #0F0E0D 100%)" },
  { key: "olive", label: "Olive", background: "linear-gradient(180deg, #7C7C4E 0%, #5C5C36 100%)" },
  { key: "sage", label: "Sage", background: "linear-gradient(180deg, #C6CFB9 0%, #9EAE8F 100%)" },
  { key: "terracotta", label: "Terracotta", background: "linear-gradient(180deg, #C97B58 0%, #A25A3B 100%)" },
  { key: "marble", label: "Marble", background: "linear-gradient(160deg,#F5F3EE 0%,#E5E1D7 40%,#F8F6F1 70%,#E9E4D8 100%)" },
];

type LightingMode = { key: string; label: string; overlay: string; mix: string };
const LIGHTING: LightingMode[] = [
  { key: "day", label: "Day", overlay: "transparent", mix: "normal" },
  { key: "warm", label: "Warm evening", overlay: "radial-gradient(60% 55% at 50% 55%, rgba(255,170,90,0.28), rgba(120,50,10,0.35))", mix: "multiply" },
  { key: "ambient", label: "Ambient", overlay: "radial-gradient(70% 60% at 50% 45%, rgba(255,240,220,0.15), rgba(20,20,30,0.35))", mix: "multiply" },
  { key: "hotel", label: "Hotel lobby", overlay: "linear-gradient(180deg, rgba(50,30,10,0.35) 0%, rgba(200,150,90,0.15) 60%, rgba(20,15,10,0.4) 100%)", mix: "multiply" },
];

function parseMeasurement(value: string | undefined): string | null {
  if (!value) return null;
  const m = value.match(/([\d.]+)\s*(cm|mm|in|inch|inches|")/i);
  return m ? `${m[1]} ${m[2].toLowerCase().replace(/^(inch|inches|")$/, "in")}` : null;
}
function extractDimensions(specs: Record<string, string>) {
  const findKey = (needles: string[]) =>
    Object.entries(specs).find(([k]) => needles.some((n) => k.toLowerCase().includes(n)))?.[1];
  const height = parseMeasurement(findKey(["height", "tall"])) ?? parseMeasurement(findKey(["dimension", "size"]));
  const width = parseMeasurement(findKey(["widest", "width", "diameter"])) ?? parseMeasurement(findKey(["opening"]));
  return { height, width };
}

type Tab = "studio" | "photos" | "spin" | "ar";

export function InteractiveProductViewer({ productName, cutoutUrl, gallery, fallbackUrl, scenes = [], specs = {} }: Props) {
  // Only offer interactive tabs when we actually have a cutout.
  const hasStudio = Boolean(cutoutUrl);
  const [tab, setTab] = useState<Tab>(hasStudio ? "studio" : "photos");

  if (!hasStudio && gallery.length === 0) {
    return <ZoomableImage src={fallbackUrl} alt={productName} className="aspect-[4/5]" />;
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {hasStudio && <TabBtn active={tab === "studio"} onClick={() => setTab("studio")} icon={<Sparkles className="h-3 w-3" />} label="Studio" />}
        {gallery.length > 0 && <TabBtn active={tab === "photos"} onClick={() => setTab("photos")} icon={<Images className="h-3 w-3" />} label={`Photos · ${gallery.length}`} />}
        {hasStudio && <TabBtn active={tab === "spin"} onClick={() => setTab("spin")} icon={<RotateCcw className="h-3 w-3" />} label="360°" />}
        {hasStudio && <TabBtn active={tab === "ar"} onClick={() => setTab("ar")} icon={<Camera className="h-3 w-3" />} label="AR" />}
      </div>

      {tab === "studio" && hasStudio && (
        <StudioTab productName={productName} cutoutUrl={cutoutUrl!} scenes={scenes} specs={specs} />
      )}
      {tab === "photos" && gallery.length > 0 && (
        <PhotosTab productName={productName} gallery={gallery} />
      )}
      {tab === "spin" && hasStudio && (
        <SpinTab productName={productName} cutoutUrl={cutoutUrl!} />
      )}
      {tab === "ar" && hasStudio && (
        <ARTab productName={productName} cutoutUrl={cutoutUrl!} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest px-3.5 py-2 rounded-full border transition-colors ${
        active ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─────────────────────────── STUDIO ─────────────────────────── */

function StudioTab({ productName, cutoutUrl, scenes, specs }: { productName: string; cutoutUrl: string; scenes: Scene[]; specs: Record<string, string> }) {
  const [wall, setWall] = useState(WALL_SWATCHES[0]);
  const [light, setLight] = useState(LIGHTING[0]);
  const [scene, setScene] = useState<Scene | null>(null);
  const [showDims, setShowDims] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const dims = useMemo(() => extractDimensions(specs), [specs]);
  const hasDims = Boolean(dims.height || dims.width);
  const usingScene = scene !== null;

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary group">
        <div
          className="absolute inset-0 transition-[background,opacity] duration-500 ease-out"
          style={
            usingScene
              ? { backgroundImage: `url(${scene!.url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: wall.background }
          }
        />
        {light.key !== "day" && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{ background: light.overlay, mixBlendMode: light.mix as React.CSSProperties["mixBlendMode"] }}
          />
        )}
        <img
          src={cutoutUrl}
          alt={productName}
          draggable={false}
          className="absolute inset-0 m-auto h-[82%] w-auto max-w-[80%] object-contain select-none drop-shadow-[0_30px_40px_rgba(0,0,0,0.25)]"
          style={{ filter: light.key === "warm" ? "brightness(0.92) saturate(1.05)" : undefined }}
        />

        {showDims && hasDims && !usingScene && <DimensionOverlay dims={dims} />}

        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-3 top-3 rounded-full bg-background/85 backdrop-blur px-3 py-2 text-[10px] uppercase tracking-widest inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Expand className="h-3 w-3" /> Full view
        </button>
        <div className="absolute left-3 top-3 rounded-full bg-background/85 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-widest">
          {usingScene ? scene!.label : `${wall.label} · ${light.label}`}
        </div>
      </div>

      <div className="mt-5">
        <div className="eyebrow mb-2.5">Background</div>
        <div className="flex flex-wrap gap-2">
          {WALL_SWATCHES.map((s) => {
            const active = !usingScene && wall.key === s.key;
            return (
              <button
                key={s.key}
                onClick={() => { setWall(s); setScene(null); }}
                onMouseEnter={() => { if (!usingScene) setWall(s); }}
                title={s.label}
                aria-label={s.label}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  active ? "border-accent scale-110" : "border-border/60 hover:scale-105"
                }`}
                style={{ background: s.background }}
              />
            );
          })}
        </div>
      </div>

      {scenes.length > 0 && (
        <div className="mt-6">
          <div className="eyebrow mb-2.5">Lifestyle</div>
          <div className="flex flex-wrap gap-2">
            {scenes.map((s) => {
              const active = usingScene && scene!.url === s.url;
              return (
                <button
                  key={s.url}
                  onClick={() => setScene(active ? null : s)}
                  className={`text-[11px] uppercase tracking-widest px-3.5 py-2 rounded-full border transition-colors ${
                    active ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-start gap-6">
        {hasDims && (
          <div>
            <div className="eyebrow mb-2.5">Dimensions</div>
            <button
              onClick={() => { setShowDims((v) => !v); if (!showDims) setScene(null); }}
              disabled={usingScene}
              className={`text-[11px] uppercase tracking-widest px-3.5 py-2 rounded-full border transition-colors disabled:opacity-40 ${
                showDims ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"
              }`}
            >
              {showDims ? "Hide measurements" : "Show measurements"}
            </button>
          </div>
        )}
        <div>
          <div className="eyebrow mb-2.5">Lighting</div>
          <div className="flex flex-wrap gap-1.5">
            {LIGHTING.map((l) => (
              <button
                key={l.key}
                onClick={() => setLight(l)}
                className={`text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-full border transition-colors ${
                  light.key === l.key ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6" onClick={() => setFullscreen(false)}>
          <img src={cutoutUrl} alt={productName} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function DimensionOverlay({ dims }: { dims: { height: string | null; width: string | null } }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {dims.height && (
        <div className="absolute left-[6%] top-[9%] bottom-[9%] flex items-center gap-2">
          <div className="relative h-full w-px bg-foreground/70">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-x-[4px] border-x-transparent border-b-[6px] border-b-foreground/70" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-0 h-0 border-x-[4px] border-x-transparent border-t-[6px] border-t-foreground/70" />
          </div>
          <span className="text-[10px] uppercase tracking-widest bg-background/85 backdrop-blur px-2 py-1 rounded">H · {dims.height}</span>
        </div>
      )}
      {dims.width && (
        <div className="absolute left-[12%] right-[12%] bottom-[6%] flex flex-col items-center gap-1">
          <div className="relative w-full h-px bg-foreground/70">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0 h-0 border-y-[4px] border-y-transparent border-r-[6px] border-r-foreground/70" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-foreground/70" />
          </div>
          <span className="text-[10px] uppercase tracking-widest bg-background/85 backdrop-blur px-2 py-1 rounded">W · {dims.width}</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── PHOTOS ─────────────────────────── */

function PhotosTab({ productName, gallery }: { productName: string; gallery: GalleryItem[] }) {
  const [active, setActive] = useState(0);
  const current = gallery[Math.min(active, gallery.length - 1)];
  return (
    <div>
      <ZoomableImage key={current.url} src={current.url} alt={current.label ?? productName} className="aspect-[4/5]" />
      {gallery.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {gallery.map((g, i) => (
            <button
              key={g.url + i}
              onClick={() => setActive(i)}
              className={`aspect-square overflow-hidden bg-secondary border transition-colors ${
                i === active ? "border-accent" : "border-transparent hover:border-border"
              }`}
            >
              <img src={g.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 360° SPIN ─────────────────────────── */

function SpinTab({ productName, cutoutUrl }: { productName: string; cutoutUrl: string }) {
  const [angle, setAngle] = useState(0);
  const draggingRef = useRef<{ startX: number; startAngle: number } | null>(null);

  const onDown = (clientX: number) => {
    draggingRef.current = { startX: clientX, startAngle: angle };
  };
  const onMove = (clientX: number) => {
    if (!draggingRef.current) return;
    const dx = clientX - draggingRef.current.startX;
    setAngle(draggingRef.current.startAngle + dx * 0.6);
  };
  const onUp = () => { draggingRef.current = null; };

  useEffect(() => {
    const mm = (e: MouseEvent) => onMove(e.clientX);
    const mu = () => onUp();
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
  }, [angle]);

  // Simulated spin: rotateY on the cutout gives the impression of turning.
  // Not a photographic 360, but drag-to-rotate communicates volumetric awareness.
  return (
    <div>
      <div
        className="relative aspect-[4/5] overflow-hidden bg-secondary cursor-grab active:cursor-grabbing select-none"
        style={{ perspective: "1400px" }}
        onMouseDown={(e) => onDown(e.clientX)}
        onTouchStart={(e) => onDown(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onUp}
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_60%,#EEE9DE_0%,#CFC8B8_100%)]" />
        <img
          src={cutoutUrl}
          alt={productName}
          draggable={false}
          className="absolute inset-0 m-auto h-[82%] w-auto max-w-[80%] object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.25)]"
          style={{ transform: `rotateY(${angle}deg)`, transformStyle: "preserve-3d", transition: draggingRef.current ? "none" : "transform 200ms ease-out" }}
        />
        <div className="absolute left-3 top-3 rounded-full bg-background/85 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-widest">
          360° · Drag to rotate
        </div>
        <button
          onClick={() => setAngle(0)}
          className="absolute right-3 top-3 rounded-full bg-background/85 backdrop-blur px-3 py-2 text-[10px] uppercase tracking-widest inline-flex items-center gap-1.5"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Drag left or right to spin. Photorealistic multi-angle capture arrives with your next studio session.
      </p>
    </div>
  );
}

/* ─────────────────────────── AR (camera overlay) ─────────────────────────── */

function ARTab({ productName, cutoutUrl }: { productName: string; cutoutUrl: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState(60); // % of container height
  const [pos, setPos] = useState({ x: 50, y: 55 }); // % of container
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Camera unavailable on this device");
    }
  };

  const stop = () => {
    const v = videoRef.current;
    const s = v?.srcObject as MediaStream | null;
    s?.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setStreaming(false);
  };

  useEffect(() => () => stop(), []);

  const onPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      dx: e.clientX - (rect.left + (pos.x / 100) * rect.width),
      dy: e.clientY - (rect.top + (pos.y / 100) * rect.height),
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - dragRef.current.dx - rect.left) / rect.width) * 100;
    const y = ((e.clientY - dragRef.current.dy - rect.top) / rect.height) * 100;
    setPos({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) });
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <div>
      <div
        ref={containerRef}
        className="relative aspect-[4/5] overflow-hidden bg-secondary"
      >
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover bg-black" />
        {!streaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary p-8 text-center">
            <Camera className="h-8 w-8 text-muted-foreground" />
            <h3 className="font-serif text-xl">See it in your space</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              We'll use your device camera. Drag the piece to place it, pinch or use the slider to size it.
            </p>
            <button
              onClick={start}
              className="mt-2 rounded-full bg-primary px-6 py-2.5 text-xs uppercase tracking-widest text-primary-foreground"
            >
              Start camera
            </button>
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
            <p className="text-[10px] text-muted-foreground/70 mt-2">Works best on mobile. Best viewed in bright, even light.</p>
          </div>
        )}
        {streaming && (
          <>
            <img
              src={cutoutUrl}
              alt={productName}
              draggable={false}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="absolute select-none touch-none cursor-grab active:cursor-grabbing drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                height: `${size}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
            <button
              onClick={stop}
              className="absolute right-3 top-3 rounded-full bg-background/85 backdrop-blur p-2"
              aria-label="Close AR"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute left-3 top-3 rounded-full bg-background/85 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-widest">
              AR Preview
            </div>
          </>
        )}
      </div>
      {streaming && (
        <div className="mt-4">
          <label className="eyebrow mb-2 block">Size</label>
          <input
            type="range"
            min={20}
            max={95}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-[hsl(var(--accent))]"
          />
        </div>
      )}
    </div>
  );
}
