# InTracker Dev — TODO

## Architecture / Code Quality

- [ ] **Refactor `applyUserState()`** — Function is called from too many places (`init`, `input-user change`, `applyTruckVisibility`, `loadLocations`, `selectLocation change`) and has cascading side effects (touches button states, placeholder text, calls `scheduleTruckDropdown`). Should be split into discrete, explicit state-sync calls at each callsite rather than one "synchronize everything" function.

## Cleanup

- [ ] **Remove dead Orders API** — `GET /api/orders`, `POST /api/orders/upload`, `PUT /api/orders/:partNumber`, `POST /api/orders/:partNumber/receive`, and `orders.csv` are no longer used now that PO tracking moved to per-location `po.json`. Safe to delete.
