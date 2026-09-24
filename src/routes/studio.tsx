import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FittingCanvas from "@/components/atelier/FittingCanvas";
import { SiteLogo } from "@/components/atelier/SiteLogo";
import {
  BODY_SHAPES,
  DEFAULT_MEASUREMENTS,
  SHAPE_PRESETS,
  type BodyShapeId,
  type Measurements,
  type ModelStyle,
} from "@/lib/body";
import {
  CATALOG,
  IMPORT_SHAPES,
  inr,
  type CatalogItem,
  type Slot,
} from "@/lib/catalog";

export const Route = createFileRoute("/studio")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fitting room — Atelier" },
      {
        name: "description",
        content:
          "Set your body type, upload a photo and watch pieces from Zara, H&M, Myntra and Nykaa Fashion drape on your 3D model in real time.",
      },
      { property: "og:title", content: "Fitting room — Atelier" },
      {
        property: "og:description",
        content: "See clothes on your own 3D body model in real time.",
      },
    ],
  }),
  component: Studio,
});

const SLIDERS: { key: keyof Measurements; label: string; min: number; max: number; unit: string }[] = [
  { key: "height_cm", label: "Height", min: 140, max: 200, unit: "cm" },
  { key: "weight_kg", label: "Weight", min: 38, max: 140, unit: "kg" },
  { key: "bust_cm", label: "Bust / chest", min: 70, max: 140, unit: "cm" },
  { key: "waist_cm", label: "Waist", min: 55, max: 140, unit: "cm" },
  { key: "hips_cm", label: "Hips", min: 70, max: 150, unit: "cm" },
  { key: "shoulder_cm", label: "Shoulders", min: 30, max: 55, unit: "cm" },
  { key: "inseam_cm", label: "Inseam", min: 55, max: 95, unit: "cm" },
];

/** Average the middle of an uploaded photo to guess a skin tone for the model. */
async function toneFromPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const c = document.createElement("canvas");
  const size = 64;
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return "#c99770";
  ctx.drawImage(bitmap, 0, 0, size, size);
  const { data } = ctx.getImageData(size * 0.3, size * 0.15, size * 0.4, size * 0.35);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const rr = data[i]!;
    const gg = data[i + 1]!;
    const bb = data[i + 2]!;
    // keep pixels that look like skin, skip background
    if (rr > 60 && rr > bb && rr >= gg && rr - bb > 12) {
      r += rr;
      g += gg;
      b += bb;
      n++;
    }
  }
  if (!n) return "#c99770";
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function Studio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [m, setM] = useState<Measurements>(DEFAULT_MEASUREMENTS);
  const [shape, setShape] = useState<BodyShapeId>("hourglass");
  const [modelStyle, setModelStyle] = useState<ModelStyle>("female");
  const [skinTone, setSkinTone] = useState("#c99770");
  const [photo, setPhoto] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(true);
  const [worn, setWorn] = useState<Partial<Record<Slot, CatalogItem>>>({});
  const [closet, setCloset] = useState<CatalogItem[]>([]);
  const [tab, setTab] = useState<"body" | "shop">("body");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setM({
          height_cm: Number(data.height_cm),
          weight_kg: Number(data.weight_kg),
          bust_cm: Number(data.bust_cm),
          waist_cm: Number(data.waist_cm),
          hips_cm: Number(data.hips_cm),
          shoulder_cm: Number(data.shoulder_cm),
          inseam_cm: Number(data.inseam_cm),
        });
        setShape((data.body_shape as BodyShapeId) ?? "hourglass");
        setModelStyle(data.gender_presentation === "male" ? "male" : "female");
        setSkinTone(data.skin_tone ?? "#c99770");
      }
      const { data: items } = await supabase
        .from("wardrobe_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (items) {
        setCloset(
          items.map((it) => {
            const shapeDef = IMPORT_SHAPES[it.category] ?? IMPORT_SHAPES["top"]!;
            return {
              id: it.id,
              name: it.name,
              brand: it.brand,
              price: Number(it.price ?? 0),
              color: it.color,
              slot: shapeDef.slot,
              spec: shapeDef.spec,
              url: it.source_url ?? "#",
              source: (it.source as CatalogItem["source"]) ?? "cart",
            };
          }),
        );
      }
    })();
  }, [user]);

  const applyShape = useCallback((id: BodyShapeId) => {
    setShape(id);
    setM((prev) => ({ ...prev, ...SHAPE_PRESETS[id] }));
  }, []);

  async function onPhoto(file: File) {
    if (!user) return;
    setPhoto(URL.createObjectURL(file));
    try {
      const tone = await toneFromPhoto(file);
      setSkinTone(tone);
      const path = `${user.id}/body.${file.name.split(".").pop() ?? "jpg"}`;
      const { error } = await supabase.storage
        .from("body-photos")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      await supabase
        .from("profiles")
        .upsert({ id: user.id, photo_url: path, skin_tone: tone }, { onConflict: "id" });
      toast.success("Photo read — model matched to your tone.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that photo");
    }
  }

  async function saveBody() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        ...m,
        body_shape: shape,
        gender_presentation: modelStyle,
        skin_tone: skinTone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Body model saved.");
  }

  const rack = useMemo(() => [...closet, ...CATALOG], [closet]);
  const wornList = useMemo(() => Object.values(worn).filter(Boolean) as CatalogItem[], [worn]);
  const total = wornList.reduce((s, i) => s + (i.price || 0), 0);

  function toggle(item: CatalogItem) {
    setWorn((prev) => {
      const next = { ...prev };
      if (next[item.slot]?.id === item.id) delete next[item.slot];
      else next[item.slot] = item;
      return next;
    });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Opening the fitting room…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <SiteLogo />
        <nav className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] sm:gap-6">
          <Link to="/closet" className="text-muted-foreground hover:text-foreground">
            Closet & carts
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/" });
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </nav>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* -------- controls -------- */}
        <aside className="order-2 border-r border-border lg:order-1">
          <div className="flex border-b border-border">
            {(["body", "shop"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-4 py-3 text-[11px] uppercase tracking-[0.24em] transition-colors ${
                  tab === t ? "bg-secondary text-foreground" : "text-muted-foreground"
                }`}
              >
                {t === "body" ? "Your body" : "The rack"}
              </button>
            ))}
          </div>

          {tab === "body" ? (
            <div className="space-y-8 p-6">
              <section>
                <p className="eyebrow">Model</p>
                <div className="mt-3 grid grid-cols-2 border border-border p-1" role="group" aria-label="Choose model">
                  {(["female", "male"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={modelStyle === option}
                      onClick={() => setModelStyle(option)}
                      className={`px-4 py-3 text-xs uppercase tracking-[0.18em] transition-colors ${
                        modelStyle === option
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="eyebrow">Body type</p>
                <div className="mt-3 space-y-2">
                  {BODY_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => applyShape(s.id)}
                      className={`w-full border px-4 py-3 text-left transition-colors ${
                        shape === s.id
                          ? "border-foreground bg-secondary"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      <span className="text-sm">{s.label}</span>
                      <span className="block text-xs text-muted-foreground">{s.note}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="eyebrow">Measurements</p>
                <div className="mt-4 space-y-5">
                  {SLIDERS.map((s) => (
                    <label key={s.key} className="block">
                      <span className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-display text-base">
                          {m[s.key]} {s.unit}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={1}
                        value={m[s.key]}
                        onChange={(e) =>
                          setM((prev) => ({ ...prev, [s.key]: Number(e.target.value) }))
                        }
                        className="mt-2 w-full accent-[var(--clay)]"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <p className="eyebrow">Your photo</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  A full-length photo lets us match the model's skin tone to yours. It stays
                  private to your account.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  {photo && (
                    <img
                      src={photo}
                      alt="Your uploaded reference photo"
                      className="h-16 w-12 object-cover"
                    />
                  )}
                  <label className="cursor-pointer border border-border px-4 py-2 text-[11px] uppercase tracking-[0.2em] hover:bg-secondary">
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onPhoto(f);
                      }}
                    />
                  </label>
                  <input
                    type="color"
                    aria-label="Skin tone"
                    value={skinTone}
                    onChange={(e) => setSkinTone(e.target.value)}
                    className="h-9 w-9 cursor-pointer border border-border bg-transparent"
                  />
                </div>
              </section>

              <button
                onClick={saveBody}
                disabled={saving}
                className="w-full bg-primary px-5 py-3 text-[11px] uppercase tracking-[0.24em] text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Saving" : "Save my body model"}
              </button>
            </div>
          ) : (
            <div className="p-6">
              <p className="eyebrow">Pieces</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Tap to dress the model. Pieces you brought in from a cart appear first.
              </p>
              <div className="mt-4 space-y-2">
                {rack.map((item) => {
                  const on = worn[item.slot]?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item)}
                      className={`flex w-full items-center gap-3 border px-3 py-3 text-left transition-colors ${
                        on ? "border-foreground bg-secondary" : "border-border hover:border-foreground/40"
                      }`}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="h-14 w-11 shrink-0 border border-border object-cover"
                        />
                      ) : (
                        <span
                          className="h-8 w-8 shrink-0 rounded-full border border-border"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{item.name}</span>
                        <span className="eyebrow">{item.brand}</span>
                      </span>
                      <span className="font-display text-sm">{item.price ? inr(item.price) : "—"}</span>
                    </button>
                  );
                })}
              </div>
              <Link
                to="/closet"
                className="mt-6 block border border-border px-4 py-3 text-center text-[11px] uppercase tracking-[0.24em] hover:bg-secondary"
              >
                Bring in a cart or closet piece
              </Link>
            </div>
          )}
        </aside>

        {/* -------- stage -------- */}
        <section className="relative order-1 h-[62vh] lg:order-2 lg:h-[calc(100vh-57px)]">
          <FittingCanvas
            measurements={m}
            modelStyle={modelStyle}
            skinTone={skinTone}
            worn={wornList}
            spinning={spinning}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5">
            <div>
              <p className="eyebrow">Live fit</p>
              <h1 className="font-display text-2xl">
                {wornList.length
                  ? `${wornList.length} pieces on you`
                  : `Your ${modelStyle} model`}
              </h1>
            </div>
            <button
              onClick={() => setSpinning((s) => !s)}
              className="pointer-events-auto border border-border bg-card/70 px-4 py-2 text-[11px] uppercase tracking-[0.2em] backdrop-blur"
            >
              {spinning ? "Stop turntable" : "Turntable"}
            </button>
          </div>

          {wornList.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="pointer-events-auto flex flex-wrap gap-2">
                {wornList.map((i) => (
                  <a
                    key={i.id}
                    href={i.url}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-border bg-card/80 px-3 py-2 text-xs backdrop-blur hover:bg-card"
                  >
                    {i.name} · <span className="text-muted-foreground">{i.brand}</span>
                  </a>
                ))}
              </div>
              <p className="font-display text-xl">{inr(total)}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
