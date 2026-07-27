/**
 * Applies the persisted Calm Mode choice before first paint so the page never
 * flashes the full layout for a returning Calm Mode user. Rendered in the
 * document head by the root layout.
 */
export const CALM_MODE_STORAGE_KEY = "camiprints:calm";

const script = `try{if(localStorage.getItem("${CALM_MODE_STORAGE_KEY}")==="1")document.documentElement.setAttribute("data-calm","")}catch(e){}`;

export function CalmModeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
