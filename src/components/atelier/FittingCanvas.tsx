import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";

import { Mannequin } from "./Mannequin";
import type { Measurements } from "@/lib/body";
import type { CatalogItem } from "@/lib/catalog";

type Props = {
  measurements: Measurements;
  skinTone: string;
  worn: CatalogItem[];
  spinning: boolean;
};

export default function FittingCanvas(props: Props) {
  const h = props.measurements.height_cm / 100;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      camera={{ position: [0, h * 0.62, h * 2.35], fov: 34 }}
    >
      <color attach="background" args={["#ece7df"]} />
      <fog attach="fog" args={["#ece7df", 6, 16]} />

      <hemisphereLight args={["#fdf7ec", "#b7ada0", 0.75]} />
      <directionalLight
        position={[2.4, 4.2, 3]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={3}
        shadow-camera-bottom={-1}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.55} color="#cbd6e2" />

      <Environment>
        <Lightformer intensity={2} position={[0, 4, 2]} scale={[6, 6, 1]} />
        <Lightformer
          intensity={1.1}
          color="#e8d6c4"
          position={[-4, 1.5, 1]}
          rotation-y={Math.PI / 2}
          scale={[8, 3, 1]}
        />
        <Lightformer
          intensity={0.8}
          color="#c8d2dc"
          position={[4, 1.5, -1]}
          rotation-y={-Math.PI / 2}
          scale={[8, 3, 1]}
        />
      </Environment>

      <Suspense fallback={null}>
        <Mannequin {...props} />
      </Suspense>

      {/* studio floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color="#ded7cb" roughness={0.95} />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.5} scale={4} blur={2.4} far={2} />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={h * 1.2}
        maxDistance={h * 3.4}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.52}
        target={[0, h * 0.55, 0]}
      />
    </Canvas>
  );
}
