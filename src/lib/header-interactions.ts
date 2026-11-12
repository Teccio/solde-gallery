/** Le bouton déclencheur ne doit pas être traité comme un clic extérieur :
 * sinon mousedown ferme le panneau avant que click ne le rouvre aussitôt. */
export function isHeaderToggle(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest("[data-header-toggle]");
}