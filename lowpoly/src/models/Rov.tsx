// Low-poly ROV (remotely operated vehicle): yellow float block, white frame, thrusters, two lamps with light beams.
import * as THREE from "three";

export const Rov: React.FC<{ t: number; lights?: number }> = ({ t, lights = 1 }) => {
  const spin = t * 25; // thruster props
  return (
    <group>
      {/* buoyancy block + body */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.1, 0.3, 0.75]} />
        <meshStandardMaterial color="#f2c230" flatShading roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[1.0, 0.34, 0.7]} />
        <meshStandardMaterial color="#e8ecef" flatShading roughness={0.5} />
      </mesh>
      {/* frame skids */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.45, -0.24, 0]}>
          <boxGeometry args={[0.06, 0.06, 0.85]} />
          <meshStandardMaterial color="#3b4148" flatShading />
        </mesh>
      ))}
      {/* thrusters */}
      {[[-0.62, 0.05, -0.2], [0.62, 0.05, -0.2], [-0.62, 0.05, 0.2], [0.62, 0.05, 0.2]].map((p, i) => (
        <group key={i} position={p as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.11, 0.11, 0.14, 8, 1, true]} />
            <meshStandardMaterial color="#2c3238" flatShading side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[0, spin, 0]}>
            <boxGeometry args={[0.02, 0.03, 0.18]} />
            <meshStandardMaterial color="#f2c230" flatShading />
          </mesh>
        </group>
      ))}
      {/* camera dome */}
      <mesh position={[0, -0.02, 0.36]} scale={[0.13, 0.13, 0.08]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#10161c" flatShading metalness={0.6} roughness={0.2} />
      </mesh>
      {/* lamps + beams */}
      {[-0.33, 0.33].map((x) => (
        <group key={x} position={[x, 0.1, 0.36]}>
          <mesh scale={0.06}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={new THREE.Color("#fffbe8").multiplyScalar(0.3 + 0.9 * lights)} />
          </mesh>
          {lights > 0 && (
            <mesh position={[0, -0.55, 1.35]} rotation={[-Math.PI / 2 - 0.38, 0, 0]}>
              <coneGeometry args={[0.55, 3, 10, 1, true]} />
              <meshBasicMaterial color="#d8f4ff" transparent opacity={0.07 * lights} blending={THREE.AdditiveBlending}
                depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
      <pointLight position={[0, -0.4, 1.4]} intensity={6 * lights} distance={5} color="#eaf6ff" />
    </group>
  );
};
