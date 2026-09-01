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
} from "@/lib/body";
import type { CatalogItem } from "@/lib/catalog";

type Props = {
  measurements: Measurements;
  skinTone: string;
  worn: CatalogItem[];
  spinning: boolean;
};

function Skin({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.82} metalness={0} />;
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

export function Mannequin({ measurements, skinTone, worn, spinning }: Props) {
  const group = useRef<THREE.Group>(null);
  const rig = useMemo(() => buildRig(measurements), [measurements]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    if (spinning) group.current.rotation.y += dt * 0.5;
  });

  const body = useMemo(() => {
    const torso = lathe(torsoKeys(rig, { from: rig.y.crotch - 0.01, to: rig.y.shoulder + 0.014 * rig.H }));
    const leg = lathe(legKeys(rig, { hem: rig.y.ankle }), 28);
    const arm = lathe(armKeys(rig, { hem: rig.y.waist - 0.03 * rig.H }), 22);
    return { torso, leg, arm };
  }, [rig]);

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

  const headY = rig.y.chin + 0.07 * rig.H;

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* ---- body ---- */}
      <mesh geometry={body.torso} scale={rig.torsoScale} castShadow receiveShadow>
        <Skin color={skinTone} />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh
          key={`leg${s}`}
          geometry={body.leg}
          position={[s * rig.legOffset, 0, 0]}
          scale={[1, 1, 0.94]}
          castShadow
          receiveShadow
        >
          <Skin color={skinTone} />
        </mesh>
      ))}

      {[-1, 1].map((s) => (
        <mesh
          key={`arm${s}`}
          geometry={body.arm}
          position={[s * (rig.armOffset + rig.rBust * 0.1), 0, 0]}
          rotation={[0, 0, -s * 0.07]}
          castShadow
        >
          <Skin color={skinTone} />
        </mesh>
      ))}

      {/* neck + head */}
      <mesh position={[0, (rig.y.neck + rig.y.chin) / 2, 0]} castShadow>
        <cylinderGeometry args={[rig.H * 0.038, rig.H * 0.046, rig.y.chin - rig.y.neck + 0.02, 20]} />
        <Skin color={skinTone} />
      </mesh>
      <mesh position={[0, headY, 0]} scale={[0.86, 1.06, 0.92]} castShadow>
        <sphereGeometry args={[rig.H * 0.068, 32, 24]} />
        <Skin color={skinTone} />
      </mesh>

      {/* feet */}
      {[-1, 1].map((s) => {
        const shoe = worn.find((i) => i.slot === "shoes");
        return (
          <mesh
            key={`foot${s}`}
            position={[s * rig.legOffset, rig.y.ankle * 0.45, rig.H * 0.028]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[rig.rHip * 0.55, rig.y.ankle * 0.95, rig.H * 0.13]} />
            {shoe ? (
              <Fabric color={shoe.color} thickness={0.02} />
            ) : (
              <Skin color={skinTone} />
            )}
          </mesh>
        );
      })}

      {/* ---- garments ---- */}
      {layers.map((layer) => {
        if (layer.kind === "legs" && layer.geo) {
          return [-1, 1].map((s) => (
            <mesh
              key={`${layer.item.id}-${s}`}
              geometry={layer.geo!}
              position={[s * rig.legOffset, 0, 0]}
              scale={[1, 1, 0.96]}
              castShadow
            >
              <Fabric color={layer.item.color} thickness={layer.thickness} />
            </mesh>
          ));
        }
        if (layer.kind === "torso" && layer.geo) {
          return (
            <group key={layer.item.id}>
              <mesh geometry={layer.geo} scale={rig.torsoScale} castShadow>
                <Fabric color={layer.item.color} thickness={layer.thickness} />
              </mesh>
              {layer.sleeve
                ? [-1, 1].map((s) => (
                    <mesh
                      key={`${layer.item.id}-sl${s}`}
                      geometry={layer.sleeve!}
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
