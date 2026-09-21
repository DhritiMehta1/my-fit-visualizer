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
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.56}
      metalness={0}
      clearcoat={0.08}
      clearcoatRoughness={0.72}
      sheen={0.18}
      sheenColor={color}
      sheenRoughness={0.8}
      emissive={color}
      emissiveIntensity={0.018}
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
  const skin = new THREE.Color(color);
  const browColor = skin.clone().multiplyScalar(0.31).getStyle();
  const lipColor = skin.clone().lerp(new THREE.Color("#8f4f52"), 0.46).getStyle();
  const blushColor = skin.clone().lerp(new THREE.Color("#b86665"), 0.24).getStyle();
  const irisColor = "#4b372c";

  return (
    <group position={[0, headY, 0]}>
      <mesh scale={[0.84, 1.08, 0.9]} castShadow>
        <sphereGeometry args={[headRadius, 56, 42]} />
        <Skin color={color} />
      </mesh>
      {/* Lower face softens the jaw rather than leaving a spherical doll head. */}
      <mesh position={[0, -headRadius * 0.61, headRadius * 0.035]} scale={[0.62, 0.4, 0.66]} castShadow>
        <sphereGeometry args={[headRadius, 40, 28]} />
        <Skin color={color} />
      </mesh>
      {/* Short neutral hair adds a natural silhouette without hiding the face. */}
      <mesh position={[0, headRadius * 0.42, -headRadius * 0.05]} scale={[0.865, 0.73, 0.92]} castShadow>
        <sphereGeometry args={[headRadius, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.61]} />
        <meshStandardMaterial color={browColor} roughness={0.9} />
      </mesh>
      {/* Nose bridge and tip. */}
      <mesh position={[0, -headRadius * 0.01, headRadius * 0.82]} scale={[0.12, 0.27, 0.2]} castShadow>
        <sphereGeometry args={[headRadius, 28, 20]} />
        <Skin color={color} />
      </mesh>
      <mesh position={[0, -headRadius * 0.14, headRadius * 0.96]} scale={[0.23, 0.13, 0.17]} castShadow>
        <sphereGeometry args={[headRadius, 24, 16]} />
        <Skin color={color} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`face-${side}`}>
          <group position={[side * headRadius * 0.3, headRadius * 0.18, headRadius * 0.79]}>
            <mesh scale={[1.55, 0.72, 0.34]}>
              <sphereGeometry args={[headRadius * 0.1, 24, 16]} />
              <meshPhysicalMaterial color="#f5eee8" roughness={0.3} clearcoat={0.22} />
            </mesh>
            <mesh position={[-side * headRadius * 0.008, 0, headRadius * 0.03]}>
              <sphereGeometry args={[headRadius * 0.047, 20, 16]} />
              <meshPhysicalMaterial color={irisColor} roughness={0.35} clearcoat={0.35} />
            </mesh>
            <mesh position={[-side * headRadius * 0.008, 0, headRadius * 0.071]}>
              <sphereGeometry args={[headRadius * 0.021, 16, 12]} />
              <meshStandardMaterial color="#17120f" roughness={0.3} />
            </mesh>
            <mesh position={[-side * headRadius * 0.017, headRadius * 0.018, headRadius * 0.088]}>
              <sphereGeometry args={[headRadius * 0.008, 12, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
          <mesh
            position={[side * headRadius * 0.3, headRadius * 0.34, headRadius * 0.79]}
            rotation-z={-side * 0.08}
            scale={[1.5, 0.22, 0.24]}
          >
            <sphereGeometry args={[headRadius * 0.08, 20, 10]} />
            <meshStandardMaterial color={browColor} roughness={0.95} />
          </mesh>
          <mesh position={[side * headRadius * 0.84, 0, 0]} scale={[0.34, 0.58, 0.2]} castShadow>
            <sphereGeometry args={[headRadius * 0.44, 18, 12]} />
            <Skin color={color} />
          </mesh>
          <mesh position={[side * headRadius * 0.43, -headRadius * 0.13, headRadius * 0.73]} scale={[1.3, 0.7, 0.22]}>
            <sphereGeometry args={[headRadius * 0.12, 16, 10]} />
            <meshStandardMaterial color={blushColor} transparent opacity={0.16} roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -headRadius * 0.39, headRadius * 0.82]} scale={[1, 0.19, 0.12]}>
        <sphereGeometry args={[headRadius * 0.23, 28, 14]} />
        <meshPhysicalMaterial color={lipColor} roughness={0.56} clearcoat={0.08} />
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
          <mesh position={[s * (rig.armOffset + rig.rBust * 0.06), rig.y.shoulder - 0.01 * rig.H, 0]} scale={[1.18, 1, 0.92]} castShadow>
            <sphereGeometry args={[rig.rBust * 0.23, 22, 16]} />
            <Skin color={skinTone} />
          </mesh>
          <Hand side={s as -1 | 1} rig={rig} color={skinTone} />
        </group>
      ))}

      {/* neck, shoulder transition + face */}
      <mesh position={[0, rig.y.neck - 0.018 * rig.H, 0]} scale={[1.72, 0.46, 0.94]} castShadow>
        <sphereGeometry args={[rig.H * 0.055, 28, 16]} />
        <Skin color={skinTone} />
      </mesh>
      <mesh position={[0, (rig.y.neck + rig.y.chin) / 2, 0]} castShadow>
        <cylinderGeometry args={[rig.H * 0.037, rig.H * 0.048, rig.y.chin - rig.y.neck + 0.02, 24]} />
        <Skin color={skinTone} />
      </mesh>
      <Face rig={rig} color={skinTone} />

      {/* Soft joint landmarks remove the straight, carved-limb appearance. */}
      {([-1, 1] as const).map((side) => (
        <group key={`joint-details-${side}`}>
          <mesh
            position={[side * rig.legOffset, rig.y.knee + rig.H * 0.004, rig.rHip * 0.24]}
            scale={[0.9, 1.08, 0.42]}
            castShadow
          >
            <sphereGeometry args={[rig.rHip * 0.23, 24, 16]} />
            <Skin color={skinTone} />
          </mesh>
          <mesh
            position={[side * (rig.armOffset + rig.rBust * 0.1), rig.y.waist + rig.H * 0.085, rig.rBust * 0.035]}
            scale={[0.92, 1.04, 0.88]}
            castShadow
          >
            <sphereGeometry args={[rig.rBust * 0.145, 20, 14]} />
            <Skin color={skinTone} />
          </mesh>
        </group>
      ))}

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
