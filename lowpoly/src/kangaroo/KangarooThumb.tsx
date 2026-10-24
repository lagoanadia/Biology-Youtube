// Thumbnail for the kangaroo POV short: red kangaroo with its tiny forest ancestor in front of it.
import { IslandBackdrop, IslandLights } from "../env/Island";
import { ThumbShell } from "../lib/shortkit";
import { Kangaroo } from "../models/Kangaroo";
import { Outback } from "./KangarooShort";

export const KangarooThumb: React.FC = () => (
  <ThumbShell
    bg={<IslandBackdrop sky="warm" />}
    world={<IslandLights sky="warm" light={1.1} fogNear={10} fogFar={34} />}
    cam={{ pos: [1.3, 1.5, 4.6], look: [0.15, 1.15, 0] }}
    body={
      <>
        <Outback t={1} />
        <group position={[-0.25, 0, -0.3]} rotation={[0, 0.45, 0]}>
          <Kangaroo t={1} evo={1} />
        </group>
        <group position={[0.55, 0, 0.6]} rotation={[0, -0.5, 0]} scale={1.15}>
          <Kangaroo t={1} evo={0} />
        </group>
      </>
    }
    lines={["POV: YOU'RE", "THE ANCESTOR"]}
    size={120}
  />
);
