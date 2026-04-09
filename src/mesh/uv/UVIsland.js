import { bounds } from "./UVMath.js";

export function createIsland(indices = [], uvArray = []) {
  const points = indices.map((i) => ({
    x: uvArray[i * 2],
    y: uvArray[i * 2 + 1],
  }));

  return {
    indices: [...indices],
    points,
    bounds: bounds(points),
    selected: false,
    visible: true,
    locked: false,
  };
}

export function updateIslandBounds(island) {
  island.bounds = bounds(island.points);
  return island;
}

export function islandCenter(island) {
  return island.bounds.center;
}

export function applyPointsToUVs(island, uvArray) {
  island.indices.forEach((index, i) => {
    uvArray[index * 2] = island.points[i].x;
    uvArray[index * 2 + 1] = island.points[i].y;
  });
  return uvArray;
}

export function cloneIsland(island) {
  return {
    ...island,
    indices: [...island.indices],
    points: island.points.map((p) => ({ ...p })),
    bounds: {
      min: { ...island.bounds.min },
      max: { ...island.bounds.max },
      size: { ...island.bounds.size },
      center: { ...island.bounds.center },
    },
  };
}
