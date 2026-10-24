// Thumbnail for the Komodo virgin-birth short: mother behind her nest, babies crawling out of the eggs.
import { IslandBackdrop, IslandLights, Sand, ZooEnclosure } from "../env/Island";
import { ThumbShell } from "../lib/shortkit";
import { DragonEgg, Komodo } from "../models/Komodo";

const EGGS: [number, number, number][] = [[0, 0, 0.22], [-0.2, 0, 0.05], [0.2, 0, 0.02], [0, 0, -0.18], [0.24, 0, -0.22]];

export const KomodoThumb: React.FC = () => (
  <ThumbShell
    bg={<IslandBackdrop sky="zoo" />}
    world={<IslandLights sky="zoo" light={1.15} />}
    cam={{ pos: [2.3, 1.5, 4.8], look: [0.15, 0.35, 0.1] }}
    body={
      <>
        <Sand />
        <ZooEnclosure t={1} />
        <group position={[-0.7, 0, -0.5]} rotation={[0, 0.95, 0]}>
          <Komodo t={1.2} lift={0.6} tongue={1} />
        </group>
        <group position={[0.9, 0, 0.6]}>
          {EGGS.map((p, i) => (
            <group key={i} position={p} scale={0.75}>
              <DragonEgg crack={i % 2 ? 1 : 0} />
              {i % 2 === 1 && (
                <group position={[0, 0.03, 0.42]} rotation={[0, 0.3, 0]} scale={0.17}>
                  <Komodo t={1 + i} baby lift={0.9} tongue={1} />
                </group>
              )}
            </group>
          ))}
          <group position={[0.1, 0.03, 0.55]} rotation={[0, -0.2, 0]} scale={0.2}>
            <Komodo t={2} baby lift={0.9} tongue={1} />
          </group>
        </group>
      </>
    }
    lines={["NO DAD", "NEEDED"]}
    size={160}
  />
);
