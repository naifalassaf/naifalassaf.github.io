// jsdom has SVG elements but not createSVGRect, which Leaflet checks at import to decide it can
// draw Routes as SVG. Provide it so Routes render in tests just as they do in a browser.
if (typeof SVGSVGElement !== 'undefined' && !('createSVGRect' in SVGSVGElement.prototype)) {
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGRect', { value: () => ({ x: 0, y: 0, width: 0, height: 0 }) })
}
