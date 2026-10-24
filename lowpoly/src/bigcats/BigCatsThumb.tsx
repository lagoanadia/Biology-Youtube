// Thumbnail for the big cats POV short: tiger, leopard, jaguar and puma together on the savanna.
import { IslandBackdrop, IslandLights } from "../env/Island";
import { Outback } from "../kangaroo/KangarooShort";
import { ThumbShell, V3 } from "../lib/shortkit";
import { BigCat, CatKind } from "../models/BigCat";

const LINEUP: [CatKind, V3][] = [["tiger", [-0.5, 0, -1.6]], ["leopard", [0.7, 0, -0.9]], ["jaguar", [-0.5, 0, 0.0]], ["puma", [0.7, 0, 0.7]]];

export const BigCatsThumb: React.FC = () => (
  <ThumbShell
    bg={<IslandBackdrop sky="warm" />}
    world={<IslandLights sky="warm" light={1.1} fogNear={9} fogFar={30} />}
    cam={{ pos: [1.4, 1.6, 6.0], look: [0.1, 0.75, -0.4] }}
    body={
      <>
        <Outback t={1} />
        {LINEUP.map(([k, p], i) => (
          <group key={k} position={p} rotation={[0, -1.2, 0]} scale={0.85}>
            <BigCat t={1 + i} kind={k} look={0.6} />
          </group>
        ))}
      </>
    }
    lines={["WHO'S NOT", "FAMILY?"]}
  />
);
