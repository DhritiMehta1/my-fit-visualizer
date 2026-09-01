import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BRANDS, IMPORT_SHAPES, inr } from "@/lib/catalog";

export const Route = createFileRoute("/closet")({
  head: () => ({
    meta: [
      { title: "Closet & carts — Atelier" },
      {
        name: "description",
        content:
          "Bring pieces from your Myntra, Zara, H&M and Nykaa Fashion carts — or your own wardrobe — into the 3D fitting room.",
      },
      { property: "og:title", content: "Closet & carts — Atelier" },
      {
        property: "og:description",
        content: "Bring cart and wardrobe pieces into the 3D fitting room.",
      },
    ],
  }),
  component: ClosetPage,
});

type Row = {
  id: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  size: string | null;
  price: number | null;
  source_url: string | null;
  source: string;
};

function ClosetPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    brand: "Myntra",
    category: "top",
    color: "#2a2a2e",
    size: "",
    price: "",
    source_url: "",
    source: "cart",
  });

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  async function load() {
    const { data } = await supabase
      .from("wardrobe_items")
      .select("id,name,brand,category,color,size,price,source_url,source")
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  }

  useEffect(() => {
    if (user) void load();
  }, [user]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("wardrobe_items").insert({
      user_id: user.id,
      name: form.name,
      brand: form.brand,
      category: form.category,
      color: form.color,
      size: form.size || null,
      price: form.price ? Number(form.price) : null,
      source_url: form.source_url || null,
      source: form.source,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ ...form, name: "", size: "", price: "", source_url: "" });
    toast.success("Added — it's on the rack in the fitting room.");
    void load();
  }

  async function remove(id: string) {
    await supabase.from("wardrobe_items").delete().eq("id", id);
    void load();
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading your closet…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <Link to="/" className="font-display text-xl">
          Atelier
        </Link>
        <Link to="/studio" className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
          Fitting room
        </Link>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 py-12 lg:grid-cols-[380px_1fr]">
        <section>
          <p className="eyebrow">Bring a piece in</p>
          <h1 className="mt-2 text-3xl">Carts & closet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Add anything sitting in a Myntra, Zara, H&amp;M or Nykaa Fashion cart, or a piece you
            already own. Give it a shape and a colour and it drapes on your model.
          </p>

          <form onSubmit={add} className="mt-8 space-y-5">
            <label className="block">
              <span className="eyebrow">Piece</span>
              <input
                required
                className="field mt-1 focus:field-focus"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Linen shirt dress"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="eyebrow">Store</span>
                <select
                  className="field mt-1"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                >
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="eyebrow">Shape</span>
                <select
                  className="field mt-1"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {Object.entries(IMPORT_SHAPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="block">
                <span className="eyebrow">Colour</span>
                <input
                  type="color"
                  className="mt-2 h-9 w-full cursor-pointer border border-border bg-transparent"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="eyebrow">Size</span>
                <input
                  className="field mt-1 focus:field-focus"
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  placeholder="M"
                />
              </label>
              <label className="block">
                <span className="eyebrow">Price ₹</span>
                <input
                  type="number"
                  className="field mt-1 focus:field-focus"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="1999"
                />
              </label>
            </div>

            <label className="block">
              <span className="eyebrow">Product link</span>
              <input
                className="field mt-1 focus:field-focus"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="https://www.myntra.com/…"
              />
            </label>

            <div className="flex gap-2">
              {(["cart", "closet"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, source: s })}
                  className={`flex-1 border px-3 py-2 text-[11px] uppercase tracking-[0.2em] ${
                    form.source === s ? "border-foreground bg-secondary" : "border-border"
                  }`}
                >
                  {s === "cart" ? "In a cart" : "Already own it"}
                </button>
              ))}
            </div>

            <button
              disabled={busy}
              className="w-full bg-primary px-5 py-3 text-[11px] uppercase tracking-[0.24em] text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Adding" : "Add to my rack"}
            </button>
          </form>
        </section>

        <section>
          <p className="eyebrow">On your rack — {rows.length} pieces</p>
          {rows.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Nothing here yet. Everything you add shows up in the fitting room instantly.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-4 py-4">
                  <span
                    className="h-10 w-10 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: r.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.name}</p>
                    <p className="eyebrow">
                      {r.brand} · {IMPORT_SHAPES[r.category]?.label ?? r.category}
                      {r.size ? ` · ${r.size}` : ""} · {r.source === "cart" ? "in cart" : "owned"}
                    </p>
                  </div>
                  {r.price ? <span className="font-display">{inr(Number(r.price))}</span> : null}
                  {r.source_url ? (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline underline-offset-4"
                    >
                      Open
                    </a>
                  ) : null}
                  <button
                    onClick={() => remove(r.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/studio"
            className="mt-8 inline-block bg-primary px-6 py-3 text-[11px] uppercase tracking-[0.24em] text-primary-foreground"
          >
            Try these on
          </Link>
        </section>
      </div>
    </main>
  );
}
