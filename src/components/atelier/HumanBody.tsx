import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import modelAsset from "@/assets/models/male-mannequin.glb.asset.json";
import type { BodyRig } from "@/lib/body";

export const HUMAN_MODEL_URL = modelAsset.url;

type Part = { geometry: THREE.BufferGeometry; kind: "skin" | "detail" | "pant"; source: THREE.Material };

/** Smooth female silhouette curve by normalized height (0 = floor, 1 = crown). */
function femaleWidth(t: number) {
  const pts: [number, number][] = [
    [0, 0.94], [0.3, 0.97], [0.42, 1.06], [0.5, 1.12], [0.55, 1.1],
    [0.62, 0.88], [0.7, 0.93], [0.76, 0.92], [0.81, 0.86], [0.86, 0.9], [1, 0.94],
  ];
  for (let i = 1; i < pts.length; i++) {
    const [t1, v1] = pts[i]!;
    const [t0, v0] = pts[i - 1]!;
    if (t <= t1) {
      const k = THREE.MathUtils.smoothstep((t - t0) / (t1 - t0), 0, 1);
      return v0 + (v1 - v0) * k;
    }
  }
  return pts[pts.length - 1]![1];
}

/** Bust volume added to the front of the chest for the female body. */
function femaleDepth(t: number, x: number, z: number, h: number) {
  const band = Math.exp(-(((t - 0.72) / 0.035) ** 2));
  const side = Math.exp(-(((Math.abs(x) - 0.055 * h) / (0.05 * h)) ** 2));
  return z > 0 ? 1 + 0.22 * band * side : 1;
}

export function HumanBody({ rig, skinTone }: { rig: BodyRig; skinTone: string }) {
  const { scene } = useGLTF(HUMAN_MODEL_URL);

  // Bake the GLB into world-space geometry once (never mutate the shared scene).
  const baked = useMemo(() => {
    scene.updateMatrixWorld(true);
    const parts: Part[] = [];
    const box = new THREE.Box3();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      geometry.computeBoundingBox();
      box.union(geometry.boundingBox!);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const kind = mat.name === "pant" ? "pant" : mat.transparent ? "detail" : "skin";
      parts.push({ geometry, kind, source: mat });
    });
    return { parts, box };
  }, [scene]);

  const { parts, materials } = useMemo(() => {
    const { box } = baked;
    const h0 = box.max.y - box.min.y;
    const cx = (box.max.x + box.min.x) / 2;
    const cz = (box.max.z + box.min.z) / 2;
    const s = rig.H / h0;
    const female = !rig.isMale;

    // Measure the hip band so the body matches the measurement-driven garments.
    let maxX = 0;
    let maxZ = 0;
    for (const p of baked.parts) {
      if (p.kind !== "skin" && p.kind !== "pant") continue;
      const pos = p.geometry.attributes.position!;
      for (let i = 0; i < pos.count; i++) {
        const t = (pos.getY(i) - box.min.y) / h0;
        if (t < 0.5 || t > 0.56) continue;
        const x = Math.abs(pos.getX(i) - cx);
        if (x > 0.13 * h0) continue;
        maxX = Math.max(maxX, x);
        maxZ = Math.max(maxZ, Math.abs(pos.getZ(i) - cz));
      }
    }
    const baseX = (rig.rHip * rig.torsoScale[0] * 0.94) / (Math.max(maxX, 1e-4) * s * (female ? 1.12 : 1));
    const baseZ = (rig.rHip * rig.torsoScale[2] * 0.94) / (Math.max(maxZ, 1e-4) * s);
    const kx = THREE.MathUtils.clamp(baseX, 0.75, 1.4);
    const kz = THREE.MathUtils.clamp(baseZ, 0.75, 1.4);

    const out = baked.parts.map((p) => {
      const g = p.geometry.clone();
      const pos = g.attributes.position!;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) - box.min.y;
        const t = y / h0;
        let x = pos.getX(i) - cx;
        let z = pos.getZ(i) - cz;
        if (female) {
          x *= femaleWidth(t);
          z *= femaleDepth(t, x, z, h0);
        }
        pos.setXYZ(i, x * s * kx, y * s, z * s * kz);
      }
      g.computeVertexNormals();
      return { ...p, geometry: g };
    });

    const skin = new THREE.MeshPhysicalMaterial({
      color: skinTone,
      roughness: 0.62,
      metalness: 0,
      sheen: 0.15,
      sheenColor: new THREE.Color(skinTone),
      sheenRoughness: 0.7,
      normalMap: (baked.parts.find((p) => p.kind === "skin")?.source as THREE.MeshStandardMaterial)?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.4, 0.4),
      side: THREE.DoubleSide,
    });
    const underwear = new THREE.MeshStandardMaterial({ color: "#2b2825", roughness: 0.9 });
    return { parts: out, materials: { skin, underwear } };
  }, [baked, rig, skinTone]);

  return (
    <group>
      {parts.map((p, i) => (
        <mesh
          key={i}
          geometry={p.geometry}
          material={p.kind === "skin" ? materials.skin : p.kind === "pant" ? materials.underwear : p.source}
          castShadow={p.kind !== "detail"}
          receiveShadow
        />
      ))}
    </group>
  );
}

useGLTF.preload(HUMAN_MODEL_URL);
