import * as THREE from "three";

import type { BodyRig } from "@/lib/body";
import type { GarmentSpec } from "@/lib/catalog";

/**
 * Body-driven garment fitting.
 * AVATAR -> read the actual (baked, scaled) body surface + pose -> build garments
 * as offset shells of that surface. Garments never move or reshape the avatar.
 */

export type BodySurface = {
  pos: Float32Array; // welded vertex positions
  nrm: Float32Array; // smooth normals
  tris: Uint32Array;
  count: number;
  H: number;
  isArm: Uint8Array;
  armParam: Float32Array; // 0 at shoulder -> 1 at fingertips
  armpitY: number;
  neckY: number;
  crotchY: number;
};

export function buildSurface(geoms: THREE.BufferGeometry[], H: number): BodySurface {
  const q = H * 2e-4;
  const map = new Map<string, number>();
  const P: number[] = [];
  const T: number[] = [];
  for (const g of geoms) {
    const a = g.attributes["position"]!;
    const remap = new Uint32Array(a.count);
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
      const k = `${Math.round(x / q)},${Math.round(y / q)},${Math.round(z / q)}`;
      let id = map.get(k);
      if (id === undefined) {
        id = P.length / 3;
        map.set(k, id);
        P.push(x, y, z);
      }
      remap[i] = id;
    }
    const idx = g.index;
    const n = idx ? idx.count : a.count;
    for (let i = 0; i + 2 < n; i += 3) {
      const i0 = remap[idx ? idx.getX(i) : i]!;
      const i1 = remap[idx ? idx.getX(i + 1) : i + 1]!;
      const i2 = remap[idx ? idx.getX(i + 2) : i + 2]!;
      if (i0 === i1 || i1 === i2 || i0 === i2) continue;
      T.push(i0, i1, i2);
    }
  }
  const pos = new Float32Array(P);
  const tris = new Uint32Array(T);
  const count = pos.length / 3;
  const nrm = new Float32Array(pos.length);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < tris.length; t += 3) {
    const [i0, i1, i2] = [tris[t]!, tris[t + 1]!, tris[t + 2]!];
    a.fromArray(pos, i0 * 3);
    b.fromArray(pos, i1 * 3).sub(a);
    c.fromArray(pos, i2 * 3).sub(a);
    b.cross(c);
    for (const i of [i0, i1, i2]) {
      nrm[i * 3] += b.x;
      nrm[i * 3 + 1] += b.y;
      nrm[i * 3 + 2] += b.z;
    }
  }
  for (let i = 0; i < count; i++) {
    a.fromArray(nrm, i * 3).normalize();
    a.toArray(nrm, i * 3);
  }

  // ---- landmarks read from the actual geometry ----
  const slice = 0.01 * H;
  const splitAt = (y: number) => {
    const xs: number[] = [];
    for (let i = 0; i < count; i++) {
      if (Math.abs(pos[i * 3 + 1]! - y) < slice) xs.push(Math.abs(pos[i * 3]!));
    }
    xs.sort((p, r) => p - r);
    let best = 0, at = Infinity;
    for (let i = 1; i < xs.length; i++) {
      const lo = xs[i - 1]!;
      if (lo < 0.04 * H || lo > 0.3 * H) continue;
      const gap = xs[i]! - lo;
      if (gap > best) { best = gap; at = lo + gap / 2; }
    }
    return best > 0.01 * H ? at : Infinity;
  };
  const splits = new Map<number, number>();
  let armpitY = 0.72 * H;
  let found = false;
  for (let y = 0.84 * H; y > 0.36 * H; y -= slice) {
    const s = splitAt(y);
    splits.set(Math.round(y / slice), s);
    if (!found && s !== Infinity) { armpitY = y; found = true; }
  }
  const sxA = splits.get(Math.round(armpitY / slice)) ?? 0.13 * H;

  const isArm = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const x = Math.abs(pos[i * 3]!), y = pos[i * 3 + 1]!;
    if (y > 0.9 * H) continue;
    if (y >= armpitY) isArm[i] = x > sxA ? 1 : 0;
    else {
      const s = splits.get(Math.round(y / slice)) ?? Infinity;
      isArm[i] = x > s ? 1 : 0;
    }
  }
  const sy = armpitY + 0.05 * H;
  const armParam = new Float32Array(count);
  const maxD = [1e-5, 1e-5];
  for (let i = 0; i < count; i++) {
    if (!isArm[i]) continue;
    const side = pos[i * 3]! > 0 ? 1 : 0;
    const d = Math.hypot(Math.abs(pos[i * 3]!) - sxA, pos[i * 3 + 1]! - sy, pos[i * 3 + 2]!);
    armParam[i] = d;
    maxD[side] = Math.max(maxD[side]!, d);
  }
  for (let i = 0; i < count; i++) if (isArm[i]) armParam[i]! /= maxD[pos[i * 3]! > 0 ? 1 : 0]!;

  // neck = narrowest torso slice between chest and chin
  let neckY = 0.85 * H, narrow = Infinity;
  for (let y = 0.8 * H; y < 0.92 * H; y += slice) {
    let w = 0;
    for (let i = 0; i < count; i++) {
      if (isArm[i] || Math.abs(pos[i * 3 + 1]! - y) > slice) continue;
      w = Math.max(w, Math.abs(pos[i * 3]!));
    }
    if (w > 0 && w < narrow) { narrow = w; neckY = y; }
  }
  // crotch = highest slice where the legs are separated
  let crotchY = 0.47 * H;
  for (let y = 0.56 * H; y > 0.3 * H; y -= slice) {
    let centre = false;
    for (let i = 0; i < count; i++) {
      if (isArm[i] || Math.abs(pos[i * 3 + 1]! - y) > slice * 0.5) continue;
      if (Math.abs(pos[i * 3]!) < 0.012 * H) { centre = true; break; }
    }
    if (!centre) { crotchY = y; break; }
  }

  return { pos, nrm, tris, count, H, isArm, armParam, armpitY, neckY, crotchY };
}

type Layer = "base" | "mid" | "outer";

/** Offset shell of the masked body region. */
function shell(
  s: BodySurface,
  keep: (i: number) => boolean,
  offset: (i: number) => number,
): THREE.BufferGeometry | null {
  const mask = new Uint8Array(s.count);
  for (let i = 0; i < s.count; i++) mask[i] = keep(i) ? 1 : 0;
  const remap = new Int32Array(s.count).fill(-1);
  const P: number[] = [];
  const I: number[] = [];
  for (let t = 0; t < s.tris.length; t += 3) {
    const v = [s.tris[t]!, s.tris[t + 1]!, s.tris[t + 2]!];
    if (!mask[v[0]!] || !mask[v[1]!] || !mask[v[2]!]) continue;
    for (const i of v) {
      if (remap[i] === -1) {
        remap[i] = P.length / 3;
        const o = offset(i);
        P.push(
          s.pos[i * 3]! + s.nrm[i * 3]! * o,
          s.pos[i * 3 + 1]! + s.nrm[i * 3 + 1]! * o,
          s.pos[i * 3 + 2]! + s.nrm[i * 3 + 2]! * o,
        );
      }
      I.push(remap[i]!);
    }
  }
  if (!I.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

/** Skirt / long hem: an elliptical drape measured from the body slice by slice. */
function drape(s: BodySurface, top: number, hem: number, flare: number, clear: number) {
  const measure = (y: number) => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < s.count; i++) {
      if (s.isArm[i] || Math.abs(s.pos[i * 3 + 1]! - y) > 0.012 * s.H) continue;
      const x = s.pos[i * 3]!, z = s.pos[i * 3 + 2]!;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    return x0 === Infinity ? null : { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, rx: (x1 - x0) / 2, rz: (z1 - z0) / 2 };
  };
  const m0 = measure(top);
  if (!m0) return null;
  const rings = 22, seg = 48;
  const P: number[] = [];
  let rx = m0.rx + clear, rz = m0.rz + clear;
  for (let r = 0; r <= rings; r++) {
    const k = r / rings;
    const y = top + (hem - top) * k;
    const m = measure(y);
    const fx = (m0.rx + clear) * (1 + flare * k);
    const fz = (m0.rz + clear) * (1 + flare * 0.7 * k);
    rx = Math.max(rx, fx, m ? m.rx + clear * 1.4 : 0);
    rz = Math.max(rz, fz, m ? m.rz + clear * 1.4 : 0);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      P.push(m0.cx + Math.sin(a) * rx, y, m0.cz + Math.cos(a) * rz);
    }
  }
  const I: number[] = [];
  for (let r = 0; r < rings; r++)
    for (let j = 0; j < seg; j++) {
      const a = r * (seg + 1) + j, b = a + seg + 1;
      I.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

export function fitGarment(s: BodySurface, spec: GarmentSpec, rig: BodyRig): THREE.BufferGeometry[] {
  const { H, pos, isArm, armParam } = s;
  const layer: Layer = spec.form === "jacket" ? "outer" : spec.form === "pants" || spec.form === "shoes" ? "base" : "mid";
  const t = spec.thickness ?? 0.014;
  const base = 0.004 * H + t * 0.35 + (layer === "outer" ? 0.009 * H : layer === "mid" ? 0.003 * H : 0);
  // Regional ease: body is calibrated at the hips, so chest/waist differences adjust the fabric locally.
  const chestD = THREE.MathUtils.clamp(rig.rBust - rig.rHip * 0.9375, -0.012, 0.025);
  const waistD = THREE.MathUtils.clamp(rig.rWaist - rig.rHip * 0.75, -0.012, 0.03);
  const waistY = s.crotchY + 0.15 * H;
  const chestY = s.armpitY - 0.03 * H;
  const regional = (i: number) => {
    if (isArm[i]) return 0;
    const y = pos[i * 3 + 1]!;
    const g = (c: number, w: number) => Math.exp(-(((y - c) / w) ** 2));
    return chestD * g(chestY, 0.05 * H) * 0.6 + waistD * g(waistY, 0.05 * H) * 0.6;
  };
  const off = (i: number) => Math.max(0.003 * H, base + regional(i));
  const out: THREE.BufferGeometry[] = [];
  const push = (g: THREE.BufferGeometry | null) => g && out.push(g);
  const hemY = spec.hem * H;
  const drapeTop = s.crotchY + 0.03 * H;

  if (spec.form === "shoes") {
    push(shell(s, (i) => pos[i * 3 + 1]! < 0.045 * H, () => 0.006 * H));
    return out;
  }
  if (spec.form === "pants") {
    push(shell(s, (i) => !isArm[i] && pos[i * 3 + 1]! > hemY && pos[i * 3 + 1]! < waistY, off));
    return out;
  }
  if (spec.form === "skirt") {
    push(shell(s, (i) => !isArm[i] && pos[i * 3 + 1]! > drapeTop && pos[i * 3 + 1]! < waistY, off));
    push(drape(s, drapeTop + 0.015 * H, hemY, spec.flare ?? 0.3, base));
    return out;
  }
  // top / dress / jacket
  const sleeveMax = spec.sleeve === "long" ? 0.8 : spec.sleeve === "short" ? 0.3 : 0;
  const bodyBottom = Math.max(hemY, drapeTop);
  const collar = s.neckY - 0.012 * H;
  const flare = spec.flare ?? 0;
  push(
    shell(
      s,
      (i) => {
        const y = pos[i * 3 + 1]!;
        if (isArm[i]) return sleeveMax > 0 && armParam[i]! < sleeveMax;
        return y > bodyBottom && y < collar;
      },
      (i) => {
        const y = pos[i * 3 + 1]!;
        const flareOff = !isArm[i] && y < waistY ? flare * 0.25 * (waistY - y) : 0;
        return off(i) + flareOff;
      },
    ),
  );
  if (hemY < drapeTop) push(drape(s, drapeTop + 0.015 * H, hemY, Math.max(flare, spec.form === "dress" ? 0.15 : 0.06), base + flare * 0.25 * (waistY - drapeTop)));
  return out;
}
