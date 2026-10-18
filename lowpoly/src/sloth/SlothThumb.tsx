// Thumbnail for the sloth short: on the trunk, smiling face with green algae fur.
import { ForestBack, JungleBackdrop, JungleLights, Leaves, Trunk } from "../env/Jungle";
import { ThumbShell } from "../lib/shortkit";
import { Sloth } from "../models/Sloth";

export const SlothThumb: React.FC = () => (
  <ThumbShell
    bg={<JungleBackdrop time="day" />}
    world={<JungleLights time="day" light={1.15} />}
    cam={{ pos: [0.8, 0.9, 3.9], look: [0, 0.75, 0] }}
    body={
      <>
        <Sloth t={0} algae={0.8} />
        <Trunk x={0} z={-0.32} r={0.18} y0={-4} y1={6} seed={4} />
        <Leaves pos={[-1.4, -1.2, -1.0]} size={0.8} seed={3} />
        <ForestBack z={-7} />
      </>
    }
    lines={["RISKS ITS LIFE", "TO POOP"]}
    size={120}
  />
);
