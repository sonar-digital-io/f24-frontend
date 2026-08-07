/**
 * ASCII + binary STL parsers — deliberately not THREE.STLLoader: its
 * binary/ASCII auto-detection heuristic (peeking a "triangle count" at byte
 * 80, before even checking for a "solid" prefix) can misfire and try to
 * allocate a bogus-huge typed array. Detect the format by sniffing whether
 * the content actually starts with "solid" instead, and sanity-check a
 * binary header's face count against the real byte length before trusting it.
 */

const STL_VERTEX_RE = /vertex\s+([+-]?[\d.eE+-]+)\s+([+-]?[\d.eE+-]+)\s+([+-]?[\d.eE+-]+)/g;

export function looksLikeAsciiStl(buffer: ArrayBuffer): boolean {
  // Anchoring on "starts with solid" is too strict — a stray leading byte
  // (BOM variant, whitespace the decoder doesn't normalize, etc.) makes a
  // real ASCII file look binary. Instead just check that both STL keywords
  // show up as readable text near the start of the file.
  const head = new Uint8Array(buffer, 0, Math.min(4096, buffer.byteLength));
  const text = new TextDecoder().decode(head);
  return /\bsolid\b/i.test(text) && /\bfacet\b/i.test(text);
}

// Real-world observation: the backend's "STL" result actually comes back as
// a zip archive (PK\x03\x04 local-file-header signature) containing an OPC
// package — i.e. a 3MF file, the standard zip-based 3D-printing/CAD format.
// Detect that up front so it takes a completely different load path.
export function looksLikeZip(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const b = new Uint8Array(buffer, 0, 4);
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}

export function hexDump(buffer: ArrayBuffer, length = 64): string {
  return Array.from(new Uint8Array(buffer, 0, Math.min(length, buffer.byteLength)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

export function parseAsciiStl(text: string): Float32Array {
  const vertices: number[] = [];
  let m: RegExpExecArray | null;
  STL_VERTEX_RE.lastIndex = 0;
  while ((m = STL_VERTEX_RE.exec(text)) !== null) {
    vertices.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  return new Float32Array(vertices);
}

export function parseBinaryStl(buffer: ArrayBuffer): Float32Array {
  const HEADER_SIZE = 84; // 80-byte header + uint32 face count
  const FACE_SIZE    = 50; // 12 floats (normal + 3 vertices) + uint16 attribute count
  if (buffer.byteLength < HEADER_SIZE) {
    throw new Error(`Binary STL too short to contain a header (${buffer.byteLength} bytes)`);
  }
  const reader = new DataView(buffer);
  const faces = reader.getUint32(80, true);
  const expected = HEADER_SIZE + faces * FACE_SIZE;
  if (expected !== buffer.byteLength) {
    throw new Error(
      `Binary STL face count doesn't match its byte length (header says ${faces} faces, ` +
        `expected ${expected} bytes, got ${buffer.byteLength}) — likely misdetected as binary. ` +
        `First bytes: ${hexDump(buffer)}`
    );
  }

  const positions = new Float32Array(faces * 3 * 3);
  let offset = HEADER_SIZE;
  let vi = 0;
  for (let f = 0; f < faces; f++) {
    offset += 12; // skip the facet normal — recomputed later via computeVertexNormals
    for (let v = 0; v < 3; v++) {
      positions[vi++] = reader.getFloat32(offset, true); offset += 4;
      positions[vi++] = reader.getFloat32(offset, true); offset += 4;
      positions[vi++] = reader.getFloat32(offset, true); offset += 4;
    }
    offset += 2; // attribute byte count
  }
  return positions;
}
