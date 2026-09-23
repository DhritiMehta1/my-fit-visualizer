import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLogo } from "@/components/atelier/SiteLogo";
import { CATALOG, BRAND_HOME } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atelier — see clothes on your own 3D body" },
      {
        name: "description",
        content:
          "Enter your body type and a photo, get a 3D model of yourself, and see how pieces from Zara, H&M, Myntra and Nykaa Fashion look on you in real time.",
      },
      { property: "og:title", content: "Atelier — see clothes on your own 3D body" },
      {
        property: "og:description",
        content: "A real-time 3D fitting room built around your measurements and your carts.",
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    n: "01",
    t: "Describe your body",
    d: "Pick a body shape, nudge seven measurements, add a photo so the model matches your tone.",
  },
  {
    n: "02",
    t: "Bring in your carts",
    d: "Anything sitting in a Myntra, Zara, H&M or Nykaa Fashion cart — plus what you already own.",
  },
  {
    n: "03",
    t: "Watch it drape",
    d: "Every piece is cut to your measurements and re-drapes the instant you change something.",
  },
];

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <SiteLogo />
        <nav className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] sm:gap-6">
          <Link to="/auth" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link to="/studio" className="bg-primary px-4 py-2 text-primary-foreground">
            Fitting room
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-end gap-10 px-5 py-24 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow">Real-time 3D try-on</p>
          <h1 className="mt-5 text-5xl leading-[1.05] md:text-7xl">
            See the clothes
            <br />
            on <em>your</em> body.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Atelier builds a 3D model from your measurements and a photo, then drapes whatever you
            choose — from our rack or straight out of your shopping carts — in real time.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="bg-primary px-7 py-3 text-[11px] uppercase tracking-[0.24em] text-primary-foreground"
            >
              Build my model
            </Link>
            <Link
              to="/studio"
              className="border border-border px-7 py-3 text-[11px] uppercase tracking-[0.24em] hover:bg-secondary"
            >
              Enter the fitting room
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px border border-border bg-border">
          {CATALOG.slice(0, 9).map((item) => (
            <div key={item.id} className="aspect-[3/4] bg-card p-3">
              <span
                className="block h-8 w-8 rounded-full border border-border"
                style={{ backgroundColor: item.color }}
              />
              <span className="mt-3 block text-[11px] leading-tight">{item.name}</span>
              <span className="eyebrow">{item.brand}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-border md:grid-cols-3">
          {STEPS.map((s) => (
            <article key={s.n} className="bg-background p-8">
              <p className="eyebrow">{s.n}</p>
              <h2 className="mt-3 text-2xl">{s.t}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="eyebrow">Works with what you already shop</p>
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          {Object.entries(BRAND_HOME)
            .filter(([b]) => b !== "Closet")
            .map(([brand, url]) => (
              <a
                key={brand}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="font-display text-3xl text-muted-foreground transition-colors hover:text-foreground md:text-4xl"
              >
                {brand}
              </a>
            ))}
        </div>
        <p className="mt-8 max-w-lg text-sm text-muted-foreground">
          Paste a product link into your closet and the piece joins the rack — colour, shape, size
          and price kept with it, so a whole cart can be tried on before you pay for any of it.
        </p>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        Atelier — a fitting room that knows your measurements.
      </footer>
    </main>
  );
}
