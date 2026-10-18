// Montserrat (SIL OFL, public/fonts/OFL.txt) served from public/fonts instead of fonts.gstatic.com, so renders work
// offline and behind proxies whose certificate the headless browser doesn't trust. Same API as
// `@remotion/google-fonts/Montserrat`: `const { fontFamily } = loadFont(...)`. One variable file covers weights 100-900.
import { continueRender, delayRender, staticFile } from "remotion";

const FAMILY = "Montserrat";
let loading: Promise<void> | null = null;

export const loadFont = (..._args: unknown[]) => {
  if (!loading && typeof document !== "undefined") {
    const handle = delayRender("Loading Montserrat");
    const face = new FontFace(FAMILY, `url(${staticFile("fonts/Montserrat-latin.woff2")}) format("woff2")`, {
      weight: "100 900",
    });
    loading = face
      .load()
      .then(() => {
        document.fonts.add(face);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }
  return { fontFamily: FAMILY };
};
