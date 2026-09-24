import * as THREE from "three";

export type Measurements = {
  height_cm: number;
  weight_kg: number;
  bust_cm: number;
  waist_cm: number;
  hips_cm: number;
  shoulder_cm: number;
  inseam_cm: number;
};

export type ModelStyle = "female" | "male";

export const BODY_SHAPES = [
  { id: "hourglass", label: "Hourglass", note: "Bust and hips balanced, defined waist" },
  { id: "pear", label: "Pear", note: "Hips wider than shoulders" },
  { id: "apple", label: "Apple", note: "Fuller midsection, slimmer legs" },
  { id: "rectangle", label: "Rectangle", note: "Straight up and down" },
  { id: "inverted", label: "Inverted triangle", note: "Shoulders wider than hips" },
] as const;

export type BodyShapeId = (typeof BODY_SHAPES)[number]["id"];

export const SHAPE_PRESETS: Record<BodyShapeId, Partial<Measurements>> = {
  hourglass: { bust_cm: 92, waist_cm: 68, hips_cm: 94, shoulder_cm: 38 },
  pear: { bust_cm: 86, waist_cm: 71, hips_cm: 102, shoulder_cm: 36 },
  apple: { bust_cm: 98, waist_cm: 92, hips_cm: 96, shoulder_cm: 40 },
  rectangle: { bust_cm: 88, waist_cm: 78, hips_cm: 90, shoulder_cm: 39 },
  inverted: { bust_cm: 98, waist_cm: 76, hips_cm: 88, shoulder_cm: 44 },
};

export const DEFAULT_MEASUREMENTS: Measurements = {
  height_cm: 165,
  weight_kg: 60,
  bust_cm: 90,
  waist_cm: 72,
  hips_cm: 96,
  shoulder_cm: 38,
  inseam_cm: 76,
};

/** Circumference in cm -> radius in scene metres. */
const rad = (cm: number) => cm / 100 / (2 * Math.PI);

export type BodyRig = ReturnType<typeof buildRig>;

export function buildRig(m: Measurements, modelStyle: ModelStyle = "female") {
  const H = m.height_cm / 100;
  const softness = THREE.MathUtils.clamp((m.weight_kg - 45) / 60, 0.05, 1);
  const isMale = modelStyle === "male";

  const y = {
    floor: 0,
    ankle: 0.05 * H,
    calf: 0.15 * H,
    knee: 0.28 * H,
    thigh: 0.4 * H,
    crotch: 0.47 * H,
    hip: 0.53 * H,
    waist: 0.625 * H,
    underBust: 0.69 * H,
    bust: 0.725 * H,
    chest: 0.775 * H,
    shoulder: 0.818 * H,
    neck: 0.85 * H,
    chin: 0.878 * H,
    crown: H,
  };

  const rHip = rad(m.hips_cm);
  const rWaist = rad(m.waist_cm);
  const rBust = rad(m.bust_cm);
  const shoulderHalf = m.shoulder_cm / 100 / 2;

  return {
    H,
    y,
    rHip,
    rWaist,
    rBust,
    shoulderHalf,
    softness,
    modelStyle,
    isMale,
    /** torso is elliptical: deeper across, shallower front-to-back */
    torsoScale: (isMale ? [1.1, 1, 0.88] : [1.14, 1, 0.8]) as [number, number, number],
    headScale: (isMale ? [0.91, 1.05, 0.92] : [0.86, 1.07, 0.9]) as [number, number, number],
    legOffset: rHip * (isMale ? 0.4 : 0.44),
    armOffset: shoulderHalf * (isMale ? 1.01 : 0.94),
    armBuild: isMale ? 1.12 : 0.96,
    legBuild: isMale ? 1.06 : 0.98,
    neckBuild: isMale ? 1.16 : 0.94,
  };
}

export function lathe(
  keys: { y: number; r: number }[],
  segments = 40,
  samples = 44,
): THREE.LatheGeometry {
  const curve = new THREE.SplineCurve(
    keys.map((k) => new THREE.Vector2(Math.max(k.r, 0.004), k.y)),
  );
  const pts = curve.getPoints(samples);
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}

/** Torso silhouette, optionally inflated by a garment offset. */
export function torsoKeys(rig: BodyRig, opts: { from: number; to: number; offset?: number; flare?: number }) {
  const o = opts.offset ?? 0;
  const flare = opts.flare ?? 0;
  const { y, rHip, rWaist, rBust, shoulderHalf } = rig;

  const all = [
    { y: y.crotch - 0.02 * rig.H, r: rHip * (rig.isMale ? 0.86 : 0.98) },
    { y: y.hip, r: rHip * (rig.isMale ? 0.9 : 1) },
    { y: y.waist, r: rWaist * (rig.isMale ? 0.96 : 1) },
    { y: y.underBust, r: rBust * (rig.isMale ? 0.9 : 0.94) },
    { y: y.bust, r: rBust * (rig.isMale ? 0.94 : 1) },
    { y: y.chest, r: rBust * (rig.isMale ? 0.98 : 0.9) },
    { y: y.shoulder, r: shoulderHalf * (rig.isMale ? 0.9 : 0.82) },
    { y: y.shoulder + 0.012 * rig.H, r: shoulderHalf * (rig.isMale ? 0.56 : 0.5) },
  ];

  const from = opts.from;
  const to = opts.to;
  const inRange = all.filter((k) => k.y > from && k.y < to);
  const rAt = (yy: number) => {
    let prev = all[0];
    if (!prev) return 0.004;
    for (const k of all) {
      if (k.y >= yy) {
        const t = (yy - prev.y) / Math.max(k.y - prev.y, 1e-5);
        return THREE.MathUtils.lerp(prev.r, k.r, THREE.MathUtils.clamp(t, 0, 1));
      }
      prev = k;
    }
    return prev.r;
  };

  const keys = [
    { y: from, r: rAt(from) * (1 + flare) },
    ...inRange.map((k) => ({ y: k.y, r: k.r })),
    { y: to, r: rAt(to) },
  ];

  return keys.map((k, i) => ({
    y: k.y,
    r: k.r + (i === 0 || i === keys.length - 1 ? o * 0.7 : o),
  }));
}

export function legKeys(rig: BodyRig, opts: { hem: number; offset?: number; taper?: number }) {
  const o = opts.offset ?? 0;
  const taper = opts.taper ?? 1;
  const { y, rHip } = rig;
  const base = [
    { y: y.ankle, r: rHip * 0.27 * rig.legBuild },
    { y: y.ankle + 0.035 * rig.H, r: rHip * 0.32 * rig.legBuild },
    { y: y.calf, r: rHip * 0.48 * rig.legBuild },
    { y: y.knee - 0.018 * rig.H, r: rHip * 0.38 * rig.legBuild },
    { y: y.knee + 0.018 * rig.H, r: rHip * 0.4 * rig.legBuild },
    { y: y.thigh, r: rHip * 0.62 * rig.legBuild },
    { y: y.crotch + 0.01, r: rHip * 0.72 * rig.legBuild },
  ];
  return base
    .filter((k) => k.y >= opts.hem - 1e-6)
    .map((k, i) => ({
      y: Math.max(k.y, opts.hem),
      r: k.r * (i === 0 ? taper : 1) + o,
    }));
}

export function armKeys(rig: BodyRig, opts: { hem: number; offset?: number }) {
  const o = opts.offset ?? 0;
  const { y, rBust } = rig;
  const base = [
    { y: y.waist - 0.02 * rig.H, r: rBust * 0.13 * rig.armBuild },
    { y: y.waist + 0.035 * rig.H, r: rBust * 0.15 * rig.armBuild },
    { y: y.waist + 0.09 * rig.H, r: rBust * 0.19 * rig.armBuild },
    { y: y.chest, r: rBust * 0.21 * rig.armBuild },
    { y: y.shoulder - 0.01, r: rBust * 0.26 * rig.armBuild },
    { y: y.shoulder + 0.02 * rig.H, r: rBust * 0.2 * rig.armBuild },
  ];
  return base
    .filter((k) => k.y >= opts.hem - 1e-6)
    .map((k) => ({ y: Math.max(k.y, opts.hem), r: k.r + o }));
}
