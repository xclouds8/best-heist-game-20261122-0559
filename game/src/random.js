// A small seeded random number generator (mulberry32): the same seed gives the
// same game, which is what makes the screenshot scenes repeatable. The helpers
// below (range, pick, shuffle) are the only randomness the game ever uses.

export function createRandom(seed) {
  let a = seed | 0;
  function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** A float in [min, max). */
  random.range = function range(min, max) {
    return min + random() * (max - min);
  };
  /** One element of `list`, uniformly. */
  random.pick = function pick(list) {
    return list[Math.floor(random() * list.length)];
  };
  /** A new array with `list` shuffled in place order (Fisher-Yates). */
  random.shuffle = function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const held = copy[i];
      copy[i] = copy[j];
      copy[j] = held;
    }
    return copy;
  };
  return random;
}
