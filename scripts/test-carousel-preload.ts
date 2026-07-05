import assert from "assert";
import {
  getCarouselPreloadIndexes,
  shouldEagerLoadCarouselSlide,
} from "../src/utils/carouselPreload";

assert.deepEqual(getCarouselPreloadIndexes(0, 1), [0]);
assert.deepEqual(getCarouselPreloadIndexes(0, 5), [0, 1, 4]);
assert.deepEqual(getCarouselPreloadIndexes(2, 5), [1, 2, 3]);
assert.deepEqual(getCarouselPreloadIndexes(4, 5), [0, 3, 4]);
assert.deepEqual(getCarouselPreloadIndexes(2, 0), []);
assert.equal(shouldEagerLoadCarouselSlide(1, 0, 5), true);
assert.equal(shouldEagerLoadCarouselSlide(3, 0, 5), false);
