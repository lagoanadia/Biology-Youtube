// Thumbnail for the seahorse POV short: a heavily pregnant male (see-through pouch full of eggs) in the seagrass.
import { ReefBackdrop, ReefFloor, ReefLights, Seagrass } from "../env/Reef";
import { ThumbShell } from "../lib/shortkit";
import { Seahorse } from "../models/Seahorse";

export const SeahorseThumb: React.FC = () => (
  <ThumbShell
    bg={<ReefBackdrop />}
    world={<ReefLights light={1.1} />}
    cam={{ pos: [2.05, 0.8, 0.45], look: [0, 0.62, 0.05] }}
    body={
      <>
        <ReefFloor t={1} />
        <Seagrass t={1} />
        <group rotation={[0, 0, 0]}>
          <Seahorse t={1} pouch={1} xray={0.75} eggs={1} bright={0.3} />
        </group>
      </>
    }
    lines={["DAD IS", "PREGNANT"]}
  />
);
