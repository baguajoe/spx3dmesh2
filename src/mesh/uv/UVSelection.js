import { pointInRect } from "./UVMath.js";

export function selectIsland(island) {
  island.selected = true;
  return island;
}

export function deselectIsland(island) {
  island.selected = false;
  return island;
}

export function clearSelection(islands = []) {
  islands.forEach((i) => { i.selected = false; });
  return islands;
}

export function getSelected(islands = []) {
  return islands.filter((i) => i.selected);
}

export function selectByBounds(islands = [], rect) {
  islands.forEach((island) => {
    island.selected = island.points.some((p) => pointInRect(p, rect));
  });
  return islands;
}

export function addSelectByBounds(islands = [], rect) {
  islands.forEach((island) => {
    if (island.points.some((p) => pointInRect(p, rect))) {
      island.selected = true;
    }
  });
  return islands;
}
