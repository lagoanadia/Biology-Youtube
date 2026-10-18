// Thumbnail for the tarsier short: face to face with the huge eyes, clinging to its stem at dusk.
import { ForestBack, JungleBackdrop, JungleLights, Leaves, Trunk } from "../env/Jungle";
import { ThumbShell } from "../lib/shortkit";
import { Tarsier } from "../models/Tarsier";

export const TarsierThumb: React.FC = () => (
  <ThumbShell
    bg={<JungleBackdrop time="dusk" />}
    world={<JungleLights time="dusk" light={1.2} />}
    cam={{ pos: [0, 0.35, 2.3], look: [0, 0.18, 0] }}
    body={
      <>
        <Tarsier t={0} glow={0.3} />
        <Trunk x={0} z={-0.16} r={0.07} y0={-4} y1={4} seed={2} />
        <Leaves pos={[1.4, -0.6, -1.5]} size={0.8} seed={9} />
        <ForestBack />
      </>
    }
    lines={["EYES AS BIG", "AS ITS BRAIN"]}
    size={112}
  />
);
