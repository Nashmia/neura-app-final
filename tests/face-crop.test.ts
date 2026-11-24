import { test } from "node:test";
import assert from "node:assert/strict";
import { faceCrop } from "../lib/face-crop";

test("crops a square around the face, kept inside the image", () => {
  const crop = faceCrop({ x: 400, y: 200, width: 100, height: 120 }, 1000, 800);
  assert.equal(crop.width, crop.height);
  assert.equal(crop.width, 264); // 2.2 × the face's larger side
  assert.ok(crop.x <= 400 && crop.x + crop.width >= 500);
  assert.ok(crop.y <= 200 && crop.y + crop.height >= 320);
  // A face at the corner: the crop is pushed back inside the image.
  const corner = faceCrop({ x: 0, y: 0, width: 300, height: 300 }, 600, 400);
  assert.deepEqual([corner.x, corner.y, corner.width], [0, 0, 400]);
});
