/**
 * Singleton OpenCascade.js initializer.
 *
 * The WASM module is ~63 MB and takes ~1–3 s to load. We init once and reuse
 * the result. Concurrent callers await the same Promise.
 *
 * Usage:
 *   const oc = await getOcc();
 *   const sphere = new (oc as any).BRepPrimAPI_MakeSphere(1.0);
 */

// The package ships its own locateFile logic — just call initOpenCascade().
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — opencascade.js v1.x has no bundled type definitions
import { initOpenCascade } from 'opencascade.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _promise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOcc(): Promise<any> {
  if (!_promise) {
    _promise = (initOpenCascade as () => Promise<unknown>)().catch((err: unknown) => {
      // Reset so the next caller can try again
      _promise = null;
      throw err;
    });
  }
  return _promise;
}
