// Low-poly rock outcrop (vertical face at z ≈ 0, facing +z) standing on a sediment seafloor.
import { useMemo } from "react";
import * as THREE from "three";
import { facet, rng } from "../lib/lowpoly";

export const RockOutcrop: React.FC<{ floorY?: number }> = ({ floorY = -1.1 }) => {
  const rock = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    g.scale(1.7, 1.5, 0.75);
    return facet(g, 0.12, 31);
  }, []);
  const floor = useMemo(() => {
    const g = new THREE.PlaneGeometry(16, 16, 22, 22);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const r = rng(12);
    for (let i = 0; i < pos.count; i++) pos.setY(i, (r() - 0.5) * 0.18);
    const f = g.toNonIndexed();
    f.computeVertexNormals();
    return f;
  }, []);
  return (
    <group>
      <mesh geometry={rock} position={[0, 0.1, -0.78]}>
        <meshStandardMaterial color="#4a4f5c" flatShading roughness={0.95} />
      </mesh>
      <mesh geometry={floor} position={[0, floorY, 0]}>
        <meshStandardMaterial color="#38404f" flatShading roughness={1} />
      </mesh>
    </group>
  );
};
