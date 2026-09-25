import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  armKeys,
  buildRig,
  lathe,
  legKeys,
  torsoKeys,
  type Measurements,
  type ModelStyle,
} from "@/lib/body";
import type { CatalogItem } from "@/lib/catalog";
import { HumanBody } from "./HumanBody";

type Props = {
  measurements: Measurements;
  skinTone: string;
  worn: CatalogItem[];
  spinning: boolean;
  modelStyle: ModelStyle;
};

function Skin({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.76}
      metalness={0}
      clearcoat={0.025}
      clearcoatRoughness={0.88}
      sheen={0.08}
      sheenColor={color}
      sheenRoughness={0.8}
      emissive={color}
      emissiveIntensity={0.008}
    />
  );
}

function Fabric({ color, thickness }: { color: string; thickness: number }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={THREE.MathUtils.clamp(0.55 + thickness * 6, 0.5, 0.95)}
      metalness={0.02}
      side={THREE.DoubleSide}
    />
  );
}

function Foot({ side, rig, shoe, skinTone }: { side: -1 | 1; rig: ReturnType<typeof buildRig>; shoe: CatalogItem | undefined; skinTone: string }) {
  const color = shoe?.color ?? skinTone;
  const thickness = shoe ? 0.02 : 0;

  return (
    <group position={[side * rig.legOffset, rig.y.ankle * 0.48, rig.H * 0.035]}>
      <mesh rotation-x={Math.PI / 2} scale={[0.66, 1, 0.48]} castShadow receiveShadow>
        <capsuleGeometry args={[rig.H * 0.038 + thickness, rig.H * 0.105, 8, 18]} />
        {shoe ? <Fabric color={color} thickness={thickness} /> : <Skin color={color} />}
      </mesh>
      <mesh position={[0, rig.H * 0.006, rig.H * 0.068]} scale={[1, 0.52, 1.18]} castShadow>
        <sphereGeometry args={[rig.H * 0.047 + thickness, 22, 14]} />
        {shoe ? <Fabric color={color} thickness={thickness} /> : <Skin color={color} />}
      </mesh>
    </group>
  );
}

export function Mannequin({ measurements, modelStyle, skinTone, worn, spinning }: Props) {
  const group = useRef<THREE.Group>(null);
  const rig = useMemo(() => buildRig(measurements, modelStyle), [measurements, modelStyle]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    if (spinning) group.current.rotation.y += dt * 0.5;
  });

  const dress = worn.find((i) => i.slot === "dress");
  const layers = useMemo(() => {
    const visible = dress ? worn.filter((i) => i.slot !== "top" && i.slot !== "bottom") : worn;
    return visible.map((item) => {
      const s = item.spec;
      const t = s.thickness ?? 0.014;
      const hemY = s.hem * rig.H;

      if (s.form === "pants") {
        return {
          item,
          kind: "legs" as const,
          geo: lathe(legKeys(rig, { hem: hemY, offset: t, taper: 1 }), 28),
          thickness: t,
        };
      }
      if (s.form === "shoes") {
        return { item, kind: "shoes" as const, geo: null, thickness: t };
      }
      const top =
        s.form === "skirt"
          ? rig.y.waist + 0.01
          : s.form === "jacket"
            ? rig.y.shoulder + 0.02 * rig.H
            : rig.y.shoulder + 0.012 * rig.H;
      return {
        item,
        kind: "torso" as const,
        geo: lathe(
          torsoKeys(rig, { from: hemY, to: top, offset: t, flare: s.flare ?? 0 }),
          40,
        ),
        thickness: t,
        sleeve:
          s.sleeve && s.sleeve !== "none"
            ? lathe(
                armKeys(rig, {
                  hem: s.sleeve === "long" ? rig.y.waist : rig.y.chest - 0.03 * rig.H,
                  offset: t,
                }),
                22,
              )
            : null,
      };
    });
  }, [worn, rig, dress]);

  const shoe = worn.find((item) => item.slot === "shoes");

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* ---- body: human base mesh, scaled to the user's measurements ---- */}
      <HumanBody rig={rig} skinTone={skinTone} />

      {/* shoes */}
      {shoe
        ? ([-1, 1] as const).map((side) => (
            <Foot key={`foot${side}`} side={side} rig={rig} shoe={shoe} skinTone={skinTone} />
          ))
        : null}

      {/* ---- garments ---- */}
      {layers.map((layer) => {
        if (layer.kind === "legs" && layer.geo) {
          const geometry = layer.geo;
          return [-1, 1].map((s) => (
            <mesh
              key={`${layer.item.id}-${s}`}
              geometry={geometry}
              position={[s * rig.legOffset, 0, 0]}
              scale={[1, 1, 0.96]}
              castShadow
            >
              <Fabric color={layer.item.color} thickness={layer.thickness} />
            </mesh>
          ));
        }
        if (layer.kind === "torso" && layer.geo) {
          const geometry = layer.geo;
          const sleeve = layer.sleeve;
          return (
            <group key={layer.item.id}>
              <mesh geometry={geometry} scale={rig.torsoScale} castShadow>
                <Fabric color={layer.item.color} thickness={layer.thickness} />
              </mesh>
              {sleeve
                ? [-1, 1].map((s) => (
                    <mesh
                      key={`${layer.item.id}-sl${s}`}
                      geometry={sleeve}
                      position={[s * (rig.armOffset + rig.rBust * 0.1), 0, 0]}
                      rotation={[0, 0, -s * 0.07]}
                      castShadow
                    >
                      <Fabric color={layer.item.color} thickness={layer.thickness} />
                    </mesh>
                  ))
                : null}
            </group>
          );
        }
        return null;
      })}
    </group>
  );
}
