import { Composition, Still } from "remotion";
import { CombJellyThumb } from "./combjelly/CombJellyThumb";
import { OctopusShort } from "./octopus/OctopusShort";
import { OctopusThumb } from "./octopus/OctopusThumb";
import { OrcaShort } from "./orca/OrcaShort";
import { OrcaThumb } from "./orca/OrcaThumb";
import { AnglerShort } from "./angler/AnglerShort";
import { AnglerThumb } from "./angler/AnglerThumb";
import { BasketShort } from "./basket/BasketShort";
import { BasketThumb } from "./basket/BasketThumb";
import { SeaPenShort } from "./seapen/SeaPenShort";
import { SeaPenThumb } from "./seapen/SeaPenThumb";
import { SiphonShort } from "./siphon/SiphonShort";
import { SiphonThumb } from "./siphon/SiphonThumb";
import { OwlfishShort } from "./owlfish/OwlfishShort";
import { OwlfishThumb } from "./owlfish/OwlfishThumb";
import { CombJellyShort } from "./combjelly/CombJellyShort";
import { FPS, loadTimeline, ShortProps } from "./lib/timeline";

// One composition per low-poly short. Duration comes from public/<id>/timeline.json (scripts/render_lowpoly.py).
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="CombJelly"
      component={CombJellyShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={840}
      defaultProps={{ timelineFile: "comb-jelly-rainbow/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Octopus"
      component={OctopusShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "brooding-octopus/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Orca"
      component={OrcaShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "orca-wave-wash/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Angler"
      component={AnglerShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "anglerfish-fusion/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Basket"
      component={BasketShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "basket-star-medusa/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="SeaPen"
      component={SeaPenShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "droopy-sea-pen/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Siphon"
      component={SiphonShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "christmas-tree-siphonophore/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Composition
      id="Owlfish"
      component={OwlfishShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={900}
      defaultProps={{ timelineFile: "owlfish-eyes/timeline.json" } satisfies ShortProps}
      calculateMetadata={loadTimeline}
    />
    <Still id="CombJellyThumb" component={CombJellyThumb} width={1080} height={1920} />
    <Still id="OctopusThumb" component={OctopusThumb} width={1080} height={1920} />
    <Still id="OrcaThumb" component={OrcaThumb} width={1080} height={1920} />
    <Still id="AnglerThumb" component={AnglerThumb} width={1080} height={1920} />
    <Still id="BasketThumb" component={BasketThumb} width={1080} height={1920} />
    <Still id="SeaPenThumb" component={SeaPenThumb} width={1080} height={1920} />
    <Still id="SiphonThumb" component={SiphonThumb} width={1080} height={1920} />
    <Still id="OwlfishThumb" component={OwlfishThumb} width={1080} height={1920} />
  </>
);
