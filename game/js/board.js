// board.js — the garden grid, the stone path, and the Heart Bloom's tile.
// Ember Garden plays on a 16 x 10 tile board. Tiles are 60 px, so the board
// canvas is 960 x 600. Enemies walk a winding stone path from off the left
// edge to the Heart Bloom in the bottom-right corner.

export const TILE = 60;
export const COLS = 16;
export const ROWS = 10;
export const BOARD_W = COLS * TILE; // 960
export const BOARD_H = ROWS * TILE; // 600

// Waypoints of the path in tile coordinates. The first one is off the board
// (enemies walk in from the left); the last one is the Heart Bloom's tile.
export const PATH_WAYPOINTS = [
  [-1, 1],
  [13, 1],
  [13, 3],
  [2, 3],
  [2, 5],
  [13, 5],
  [13, 7],
  [2, 7],
  [2, 8],
  [15, 8],
];

// The Heart Bloom lives on the path's last tile.
export const BLOOM_TILE = { col: 15, row: 8 };

/** Pixel waypoints for enemies to walk, as {x, y} tile centers. */
export const PATH_POINTS_PX = PATH_WAYPOINTS.map(([col, row]) => ({
  x: col * TILE + TILE / 2,
  y: row * TILE + TILE / 2,
}));

/** The total length of the stone path, in pixels. */
export function pathLengthPx() {
  let total = 0;
  for (let i = 1; i < PATH_POINTS_PX.length; i++) {
    total += Math.hypot(
      PATH_POINTS_PX[i].x - PATH_POINTS_PX[i - 1].x,
      PATH_POINTS_PX[i].y - PATH_POINTS_PX[i - 1].y,
    );
  }
  return total;
}

/** Every tile the path crosses, as a Set of "col,row" keys. */
export function computePathTiles() {
  const tiles = new Set();
  for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
    const [c0, r0] = PATH_WAYPOINTS[i - 1];
    const [c1, r1] = PATH_WAYPOINTS[i];
    const stepC = Math.sign(c1 - c0);
    const stepR = Math.sign(r1 - r0);
    let c = c0;
    let r = r0;
    while (c !== c1 || r !== r1) {
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) tiles.add(`${c},${r}`);
      c += stepC;
      r += stepR;
    }
    if (c1 >= 0 && c1 < COLS && r1 >= 0 && r1 < ROWS) tiles.add(`${c1},${r1}`);
  }
  return tiles;
}

export const PATH_TILES = computePathTiles();

/** Is this tile part of the stone path? */
export function isPathTile(col, row) {
  return PATH_TILES.has(`${col},${row}`);
}

/** Is this tile the Heart Bloom's tile? */
export function isBloomTile(col, row) {
  return col === BLOOM_TILE.col && row === BLOOM_TILE.row;
}

/** Can a tower be built on this tile? (Not path, not bloom, inside the board.) */
export function isBuildable(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  return !isPathTile(col, row) && !isBloomTile(col, row);
}

/** Pixel center of a tile. */
export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

/** Which tile is under a canvas pixel? Returns {col, row} or null. */
export function tileAt(px, py) {
  const col = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { col, row };
}
