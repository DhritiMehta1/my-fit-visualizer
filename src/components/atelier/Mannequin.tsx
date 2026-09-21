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

function Hand({ side, rig, color }: { side: -1 | 1; rig: ReturnType<typeof buildRig>; color: string }) {
  const palmY = rig.y.waist - 0.055 * rig.H;
  const palmX = side * (rig.armOffset + rig.rBust * 0.1);
  const palmWidth = rig.H * 0.046;
  const palmLength = rig.H * 0.088;
  const fingerLength = rig.H * 0.055;
  const fingerRadius = rig.H * 0.0062;
  const fingerOffsets = [-0.015, -0.005, 0.005, 0.015];

  return (
    <group position={[palmX, palmY, 0]} rotation-z={-side * 0.035}>
      <mesh scale={[0.78, 1, 0.42]} castShadow>
        <capsuleGeometry args={[palmWidth, palmLength - palmWidth * 2, 6, 12]} />
        <Skin color={color} />
      </mesh>
      {fingerOffsets.map((offset, index) => (
        <mesh
          key={offset}
          position={[offset, -palmLength * 0.68 - fingerLength * 0.42 + Math.abs(index - 1.5) * 0.003, 0]}
          scale={[1, index === 0 || index === 3 ? 0.88 : 1, 0.86]}
          castShadow
        >
          <capsuleGeometry args={[fingerRadius, fingerLength, 4, 8]} />
          <Skin color={color} />
        </mesh>
      ))}
      <mesh
        position={[-side * palmWidth * 0.58, -palmLength * 0.05, rig.H * 0.006]}
        rotation-z={side * 0.72}
        castShadow
      >
        <capsuleGeometry args={[fingerRadius * 1.12, fingerLength * 0.7, 4, 8]} />
        <Skin color={color} />
      </mesh>
    </group>
  );
}

function Face({ rig, color }: { rig: ReturnType<typeof buildRig>; color: string }) {
  const headY = rig.y.chin + 0.07 * rig.H;
  const headRadius = rig.H * 0.068;
  const detailColor = new THREE.Color(color).multiplyScalar(0.72).getStyle();

  return (
    <group position={[0, headY, 0]}>
      <mesh scale={[0.86, 1.06, 0.92]} castShadow>
        <sphereGeometry args={[headRadius, 40, 30]} />
        <Skin color={color} />
      </mesh>
      <mesh position={[0, -headRadius * 0.62, headRadius * 0.04]} scale={[0.66, 0.42, 0.72]} castShadow>
        <sphereGeometry args={[headRadius, 28, 18]} />
        <Skin color={color} />
      </mesh>
      <mesh position={[0, headRadius * 0.02, headRadius * 0.88]} scale={[0.2, 0.3, 0.34]} castShadow>
        <sphereGeometry args={[headRadius, 20, 14]} />
        <Skin color={color} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`face-${side}`}>
          <mesh position={[side * headRadius * 0.36, headRadius * 0.2, headRadius * 0.82]} scale={[1.4, 0.62, 0.34]}>
            <sphereGeometry args={[headRadius * 0.09, 16, 10]} />
            <meshStandardMaterial color={detailColor} roughness={0.8} />
          </mesh>
          <mesh position={[side * headRadius * 0.84, 0, 0]} scale={[0.34, 0.58, 0.2]} castShadow>
            <sphereGeometry args={[headRadius * 0.44, 18, 12]} />
            <Skin color={color} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -headRadius * 0.38, headRadius * 0.84]} scale={[1, 0.22, 0.18]}>
        <sphereGeometry args={[headRadius * 0.3, 18, 10]} />
        <meshStandardMaterial color={detailColor} roughness={0.9} />
      </mesh>
    </group>
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

  const shoe = worn.find((item) => item.slot === "shoes");

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
        <group key={`arm${s}`}>
          <mesh
            geometry={body.arm}
            position={[s * (rig.armOffset + rig.rBust * 0.1), 0, 0]}
            rotation={[0, 0, -s * 0.07]}
            castShadow
          >
            <Skin color={skinTone} />
          </mesh>
          <mesh position={[s * (rig.armOffset + rig.rBust * 0.1), rig.y.chest - 0.01 * rig.H, 0]} scale={[0.9, 1.12, 0.88]} castShadow>
            <sphereGeometry args={[rig.rBust * 0.2, 22, 16]} />
            <Skin color={skinTone} />
          </mesh>
          <Hand side={s as -1 | 1} rig={rig} color={skinTone} />
        </group>
      ))}

      {/* neck, shoulder transition + face */}
      <mesh position={[0, rig.y.neck - 0.018 * rig.H, 0]} scale={[1.7, 0.5, 1]} castShadow>
        <sphereGeometry args={[rig.H * 0.055, 28, 16]} />
        <Skin color={skinTone} />
      </mesh>
      <mesh position={[0, (rig.y.neck + rig.y.chin) / 2, 0]} castShadow>
        <cylinderGeometry args={[rig.H * 0.037, rig.H * 0.048, rig.y.chin - rig.y.neck + 0.02, 24]} />
        <Skin color={skinTone} />
      </mesh>
      <Face rig={rig} color={skinTone} />

      {/* feet */}
      {([-1, 1] as const).map((side) => (
        <Foot key={`foot${side}`} side={side} rig={rig} shoe={shoe} skinTone={skinTone} />
      ))}

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
