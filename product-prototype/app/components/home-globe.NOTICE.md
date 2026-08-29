# Home globe notices

## Runtime libraries

- `react-globe.gl` 2.38.0 is licensed under MIT. The installed license is at
  `node_modules/react-globe.gl/LICENSE` and the upstream project is
  <https://github.com/vasturiano/react-globe.gl>.
- `three` 0.185.1 is licensed under MIT. The installed license is at
  `node_modules/three/LICENSE` and the upstream project is
  <https://github.com/mrdoob/three.js>.

## Geographic data

The component loads the repository's existing `public/world.geojson` file.
That file contains 177 country features, including Malaysia, China, Germany
and Denmark. Its original source and license are not documented in this
repository. Confirm its provenance and redistribution terms before a public
release. No synthetic country borders are added by this component.

## Interaction provenance

The single-click preview and double-click-to-enter behavior was independently
implemented for this repository after reviewing the interaction pattern in
`changjulia/map`. No source file from that repository was copied wholesale;
the reviewed repository did not include a license file at the time of review.

## Market data boundary

- Geographic groupings and source-name aliases live in `home-globe-data.ts`.
  They contain no business metric values.
- Business metrics are requested from `/api/market-dashboard`, which aggregates
  organization-scoped D1 facts only after active membership is verified.
- A working D1 binding is reported separately from verified production data.
  Demo, mixed, unclassified, or unconnected business data is returned as
  unavailable (`null`) instead of being displayed as a real zero.
- The current schema does not provide source classification on every fact row.
  Production metrics therefore remain gated until an organization-scoped
  advertising/ERP connection is verified and the database classification is
  explicitly production or verified.
- The local migrations seed demonstration records. They validate the API and UI
  path only and must not be presented as real customer performance.
