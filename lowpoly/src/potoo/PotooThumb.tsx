// Thumbnail for the potoo short: on its broken-branch perch, yellow eyes wide open.
import { Branch, ForestBack, JungleBackdrop, JungleLights, Leaves } from "../env/Jungle";
import { ThumbShell } from "../lib/shortkit";
import { BranchStub, Potoo } from "../models/Potoo";

export const PotooThumb: React.FC = () => (
  <ThumbShell
    bg={<JungleBackdrop time="day" />}
    world={<JungleLights time="day" light={1.1} />}
    cam={{ pos: [1.2, 0.5, 5.6], look: [0, 0.1, 0] }}
    body={
      <>
        <Potoo t={0} point={0.3} eyes={1} glow={0.3} />
        <group position={[0, -0.85, -0.05]}><BranchStub h={1.0} /></group>
        <Branch from={[-3, -1.8, -0.1]} angle={0.06} len={6} r={0.2} />
        <Leaves pos={[-1.6, 0.4, -1.4]} size={0.9} seed={3} />
        <Leaves pos={[1.6, -1.0, -1.2]} size={0.7} seed={11} />
        <ForestBack />
      </>
    }
    lines={["THAT BRANCH", "IS A BIRD"]}
    size={124}
  />
);
