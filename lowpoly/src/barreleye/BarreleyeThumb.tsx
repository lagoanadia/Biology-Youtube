// Thumbnail for the barreleye short: 3/4 view with the green eyes glowing inside the see-through head.
import { DeepSeaBackdrop, DeepSeaLights, MarineSnow } from "../env/DeepSea";
import { ThumbShell } from "../lib/shortkit";
import { Barreleye } from "../models/Barreleye";

export const BarreleyeThumb: React.FC = () => (
  <ThumbShell
    bg={<DeepSeaBackdrop dim={0.15} />}
    world={<><DeepSeaLights light={1.3} /><directionalLight position={[1, 1, 4]} intensity={1.2} /><MarineSnow t={2} count={50} /></>}
    cam={{ pos: [2.2, 1.5, 3.2], look: [0, 0.45, 0.1] }}
    body={<Barreleye t={0.5} dome={0.38} />}
    lines={["SEE-THROUGH", "HEAD"]}
    color="#7dff6a"
    size={112}
  />
);
