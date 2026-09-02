import teeIvory from "@/assets/garments/tee-ivory.jpg";
import shirtInk from "@/assets/garments/shirt-ink.jpg";
import cropClay from "@/assets/garments/crop-clay.jpg";
import kurtaSage from "@/assets/garments/kurta-sage.jpg";
import jeansIndigo from "@/assets/garments/jeans-indigo.jpg";
import trouserBlack from "@/assets/garments/trouser-black.jpg";
import skirtCream from "@/assets/garments/skirt-cream.jpg";
import dressRust from "@/assets/garments/dress-rust.jpg";
import dressBlack from "@/assets/garments/dress-black.jpg";
import coatCamel from "@/assets/garments/coat-camel.jpg";
import blazerGrey from "@/assets/garments/blazer-grey.jpg";
import bootsInk from "@/assets/garments/boots-ink.jpg";

export type Slot = "top" | "bottom" | "dress" | "outer" | "shoes";

export type GarmentSpec = {
  /** how the mesh is generated */
  form: "top" | "dress" | "skirt" | "pants" | "jacket" | "shoes";
  /** hem height as a fraction of total body height */
  hem: number;
  /** extra width added below the waist, 0 = straight */
  flare?: number;
  /** fabric offset from the body in metres */
  thickness?: number;
  sleeve?: "none" | "short" | "long";
};

export type CatalogItem = {
  id: string;
  name: string;
  brand: string;
  price: number;
  color: string;
  slot: Slot;
  spec: GarmentSpec;
  url: string;
  source: "catalog" | "cart" | "closet";
  image?: string;
};

export const BRANDS = ["Zara", "H&M", "Myntra", "Nykaa Fashion", "Closet"] as const;

export const BRAND_HOME: Record<string, string> = {
  Zara: "https://www.zara.com/",
  "H&M": "https://www2.hm.com/",
  Myntra: "https://www.myntra.com/",
  "Nykaa Fashion": "https://www.nykaafashion.com/",
  Closet: "#",
};

export const CATALOG: CatalogItem[] = [
  {
    id: "c-tee-ivory",
    image: teeIvory,
    name: "Boxy cotton tee",
    brand: "Zara",
    price: 1590,
    color: "#efe9df",
    slot: "top",
    spec: { form: "top", hem: 0.6, sleeve: "short", thickness: 0.011 },
    url: "https://www.zara.com/",
    source: "catalog",
  },
  {
    id: "c-shirt-ink",
    image: shirtInk,
    name: "Oversized poplin shirt",
    brand: "H&M",
    price: 1999,
    color: "#22252c",
    slot: "top",
    spec: { form: "top", hem: 0.55, sleeve: "long", thickness: 0.022, flare: 0.1 },
    url: "https://www2.hm.com/",
    source: "catalog",
  },
  {
    id: "c-crop-clay",
    image: cropClay,
    name: "Rib knit crop",
    brand: "Myntra",
    price: 899,
    color: "#b56b47",
    slot: "top",
    spec: { form: "top", hem: 0.665, sleeve: "none", thickness: 0.008 },
    url: "https://www.myntra.com/",
    source: "catalog",
  },
  {
    id: "c-kurta-sage",
    image: kurtaSage,
    name: "Straight cotton kurta",
    brand: "Nykaa Fashion",
    price: 1499,
    color: "#8d9679",
    slot: "top",
    spec: { form: "top", hem: 0.44, sleeve: "long", thickness: 0.016, flare: 0.16 },
    url: "https://www.nykaafashion.com/",
    source: "catalog",
  },
  {
    id: "c-jeans-indigo",
    image: jeansIndigo,
    name: "Straight-leg denim",
    brand: "Zara",
    price: 3290,
    color: "#3b4b63",
    slot: "bottom",
    spec: { form: "pants", hem: 0.05, thickness: 0.016 },
    url: "https://www.zara.com/",
    source: "catalog",
  },
  {
    id: "c-trouser-black",
    image: trouserBlack,
    name: "Wide pleated trouser",
    brand: "H&M",
    price: 2499,
    color: "#1c1c1e",
    slot: "bottom",
    spec: { form: "pants", hem: 0.045, thickness: 0.03 },
    url: "https://www2.hm.com/",
    source: "catalog",
  },
  {
    id: "c-skirt-cream",
    image: skirtCream,
    name: "Bias midi skirt",
    brand: "Myntra",
    price: 1799,
    color: "#e2d5c3",
    slot: "bottom",
    spec: { form: "skirt", hem: 0.24, flare: 0.5, thickness: 0.014 },
    url: "https://www.myntra.com/",
    source: "catalog",
  },
  {
    id: "c-dress-rust",
    image: dressRust,
    name: "Slip midi dress",
    brand: "Nykaa Fashion",
    price: 2650,
    color: "#9c4a2f",
    slot: "dress",
    spec: { form: "dress", hem: 0.26, flare: 0.28, sleeve: "none", thickness: 0.01 },
    url: "https://www.nykaafashion.com/",
    source: "catalog",
  },
  {
    id: "c-dress-black",
    image: dressBlack,
    name: "Column shift dress",
    brand: "Zara",
    price: 4290,
    color: "#141416",
    slot: "dress",
    spec: { form: "dress", hem: 0.38, flare: 0.12, sleeve: "short", thickness: 0.012 },
    url: "https://www.zara.com/",
    source: "catalog",
  },
  {
    id: "c-coat-camel",
    image: coatCamel,
    name: "Longline wool coat",
    brand: "H&M",
    price: 6999,
    color: "#a1794f",
    slot: "outer",
    spec: { form: "jacket", hem: 0.34, sleeve: "long", thickness: 0.045, flare: 0.14 },
    url: "https://www2.hm.com/",
    source: "catalog",
  },
  {
    id: "c-blazer-grey",
    image: blazerGrey,
    name: "Structured blazer",
    brand: "Myntra",
    price: 3899,
    color: "#565a5f",
    slot: "outer",
    spec: { form: "jacket", hem: 0.5, sleeve: "long", thickness: 0.038 },
    url: "https://www.myntra.com/",
    source: "catalog",
  },
  {
    id: "c-boots-ink",
    image: bootsInk,
    name: "Leather ankle boot",
    brand: "Zara",
    price: 5590,
    color: "#2a2320",
    slot: "shoes",
    spec: { form: "shoes", hem: 0, thickness: 0.012 },
    url: "https://www.zara.com/",
    source: "catalog",
  },
];

/** Category label -> generated garment shape, used for imported cart/closet pieces. */
export const IMPORT_SHAPES: Record<string, { slot: Slot; spec: GarmentSpec; label: string }> = {
  top: { slot: "top", label: "Top / shirt", spec: { form: "top", hem: 0.58, sleeve: "short", thickness: 0.013 } },
  kurta: { slot: "top", label: "Kurta / tunic", spec: { form: "top", hem: 0.44, sleeve: "long", thickness: 0.016, flare: 0.16 } },
  dress: { slot: "dress", label: "Dress", spec: { form: "dress", hem: 0.28, flare: 0.26, sleeve: "none", thickness: 0.012 } },
  pants: { slot: "bottom", label: "Trousers / jeans", spec: { form: "pants", hem: 0.05, thickness: 0.02 } },
  skirt: { slot: "bottom", label: "Skirt", spec: { form: "skirt", hem: 0.26, flare: 0.45, thickness: 0.014 } },
  jacket: { slot: "outer", label: "Jacket / coat", spec: { form: "jacket", hem: 0.42, sleeve: "long", thickness: 0.04 } },
  shoes: { slot: "shoes", label: "Shoes", spec: { form: "shoes", hem: 0, thickness: 0.012 } },
};

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
