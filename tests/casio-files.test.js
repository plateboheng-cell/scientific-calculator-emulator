import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync, inflateSync} from 'node:zlib';
import {
  CASIO_FILE_LIMIT, parseCasioHeader, parseCasioFile, parseG3M, encodeG3M,
  parseG3P, encodeG3P, decodeCasioCodes, encodeCasioCodes, rgb565ToRGBA, rgbaToRGB565,
} from '../src/engine/casio-files.js';

const hex = text => Uint8Array.from(text.replace(/\s/g, '').match(/../g).map(s => parseInt(s, 16)));
const dataView = value => new DataView(value.buffer, value.byteOffset, value.byteLength);

// Independently assembled envelope: the exact 32-byte header for an 88-byte
// single-object CG archive, followed by the separately documented group/record
// fields. The 12-byte body is opaque test data, not a copied vendor program.
const nativeArchive = () => hex(`
  AA AC BD AF 90 88 9A 8D 8A FF EF FF EF FF 66 FE
  FF FF FF A7 EF 01 00 00 00 00 00 00 49 2C FF FE
  50 52 4F 47 52 41 4D 00 00 00 00 00 00 00 00 00
  00 00 00 01 73 79 73 74 65 6D 00 00 41 00 00 00
  00 00 00 00 01 00 00 00 0C 00 00 00 01 02 03 04
  05 06 07 08 09 0A 0B 0C
`);

// Header construction for malformed/independent fixtures. Values are written
// directly into the on-disk representation, without calling the production codec.
function nativeHeader(size, subtype, count = 0) {
  const out = new Uint8Array(32);
  out.set(hex('AA AC BD AF 90 88 9A 8D 00 FF EF FF EF FF 00 FE'));
  out[8] = 255 - subtype;
  dataView(out).setUint32(16, 0xffffffff - size);
  out[14] = (out[19] + 0xbf) & 255;
  out[20] = (out[19] + 0x48) & 255;
  if (subtype === 0x75 || subtype === 0x7d) {
    out[21] = subtype === 0x75 ? 1 : 0;
    out[28] = (out[18] + out[19] + (subtype === 0x75 ? 0xa3 : 0x9b)) & 255;
    out[29] = (out[19] + 0x85) & 255;
  }
  dataView(out).setUint16(30, 65535 - count);
  return out;
}

test('native G3M fixture parses exact envelope fields and exports identical bytes', async () => {
  const input = nativeArchive(); assert.equal(input.length, 88);
  const archive = parseG3M(input);
  assert.equal(archive.format, 'g3m'); assert.equal(archive.header.byteLength, 88); assert.equal(archive.header.objectCount, 1);
  assert.equal(archive.groups[0].name, 'PROGRAM');
  const file = archive.groups[0].files[0];
  assert.equal(file.directory, 'system'); assert.equal(file.name, 'A'); assert.equal(file.type, 1);
  assert.deepEqual(file.data, Uint8Array.from({length: 12}, (_, i) => i + 1));
  assert.deepEqual(encodeG3M(archive), input);
  assert.equal((await parseCasioFile(input.buffer)).format, 'g3m');
  const padded = new Uint8Array(92); padded.set(input, 2);
  assert.equal(parseG3M(new DataView(padded.buffer, 2, 88)).groups[0].files[0].name, 'A');
});

test('G3M preserves several groups, arbitrary binary payloads, native names and record reserved bytes', () => {
  const rawName = Uint8Array.of(0xe5, 0xab, 0x41, 0, 0, 0, 0, 0);
  const input = {groups: [
    {name: 'PROGRAM', files: [{name: 'FIRST', type: 1, data: [0, 255, 0x7f]}, {nameBytes: rawName, type: 42, data: [2, 0], reservedBytes: [9, 8, 7]}]},
    {name: 'LIST', files: [{name: '1', directory: 'LISTFILE', type: 6, data: Uint8Array.from({length: 256}, (_, i) => i)}]},
  ]};
  const encoded = encodeG3M(input), archive = parseG3M(encoded);
  assert.equal(archive.header.objectCount, 3); assert.equal(archive.groups.length, 2);
  assert.deepEqual(archive.groups[0].files[1].nameBytes, rawName);
  assert.equal(archive.groups[0].files[1].name, '\\xe5\\xabA');
  assert.deepEqual(archive.groups[0].files[1].reservedBytes, Uint8Array.of(9, 8, 7));
  assert.deepEqual(archive.groups[1].files[0].data, input.groups[1].files[0].data);
  assert.deepEqual(encodeG3M(archive), encoded);
  assert.deepEqual(parseG3M(encodeG3M({groups: []})).groups, []);
});

test('G3M rejects corrupt signatures, size/control fields, CG integrity bytes and invalid record bounds', () => {
  for (const offset of [0, 9, 14, 16, 20, 28, 29]) {
    const corrupt = nativeArchive(); corrupt[offset] ^= 1;
    assert.throws(() => parseG3M(corrupt), /signature|size|control|integrity/);
  }
  const groupCount = nativeArchive(); dataView(groupCount).setUint32(48, 2);
  assert.throws(() => parseG3M(groupCount), /group count/);
  const fileLength = nativeArchive(); dataView(fileLength).setUint32(69, 0x7fffffff);
  assert.throws(() => parseG3M(fileLength), /record length/);
  const trailing = new Uint8Array(89); trailing.set(nativeArchive()); trailing.set(nativeHeader(89, 0x75, 1));
  assert.throws(() => parseG3M(trailing), /trailing bytes/);
  assert.throws(() => parseG3M(new Uint8Array(CASIO_FILE_LIMIT + 1)), /16 MiB/);
  assert.throws(() => parseG3M('{"groups":[]}'), /binary bytes/);
  assert.throws(() => encodeG3M({groups: [{name: 'PROGRAM', files: [{name: 'TOO-LONG-NAME', type: 1, data: []}]}]}), /8 ASCII bytes/);
  assert.throws(() => encodeG3M({groups: [{name: 'PROGRAM', files: [{name: 'A', type: 256, data: []}]}]}), /type must be a byte/);
});

test('Casio variable and fixed-width code units round trip without inventing Unicode token meanings', () => {
  assert.deepEqual(decodeCasioCodes(hex('12 E5 AB')), [0x12, 0xe5ab]);
  assert.deepEqual(decodeCasioCodes(hex('12 E5 AB'), {table: 'legacy'}), [0x12, 0xe5, 0xab]);
  const codes = [0x12, 0xe5ab, 0x7f10, 0xf710, 0x7f, 0];
  assert.deepEqual(encodeCasioCodes(codes), hex('12 E5 AB 7F 10 F7 10 00 7F 00 00'));
  for (const encoding of ['variable', 'be16', 'le16']) assert.deepEqual(decodeCasioCodes(encodeCasioCodes(codes, {encoding}), {encoding}), codes);
  assert.deepEqual(encodeCasioCodes([0x12, 0xe5ab], {encoding: 'be16'}), hex('00 12 E5 AB'));
  assert.deepEqual(encodeCasioCodes([0x12, 0xe5ab], {encoding: 'le16'}), hex('12 00 AB E5'));
  assert.throws(() => decodeCasioCodes([0xe5]), /Truncated multibyte/);
  assert.throws(() => decodeCasioCodes([1], {encoding: 'be16'}), /Truncated fixed-width/);
  assert.throws(() => encodeCasioCodes([0x1234]), /no variable-width representation/);
  assert.throws(() => encodeCasioCodes([0xe5ab], {table: 'legacy'}), /no variable-width representation/);
});

function picturePixels() {
  const pixels = new Uint8Array(384 * 192 * 2);
  const colors = [0xf800, 0x07e0, 0x001f, 0xffff, 0x0000];
  for (let i = 0; i < 384 * 192; i++) dataView(pixels).setUint16(i * 2, colors[i % colors.length]);
  return pixels;
}

// Node zlib and a direct field writer create this fixture independently of the
// browser stream implementation used by the production encoder/decoder.
function nativePicture(pixels = picturePixels()) {
  const compressed = deflateSync(pixels, {level: 9}), out = new Uint8Array(208 + compressed.length), dv = dataView(out);
  out.set(nativeHeader(out.length, 0x7d, 65535)); out.set(hex('43 50 00 01 00 00'), 32);
  dv.setUint32(48, out.length - 32); dv.setUint32(52, 1); dv.setUint32(56, out.length - 184);
  dv.setUint32(184, 65536); dv.setUint32(188, out.length - 204);
  dv.setUint16(194, 384); dv.setUint16(196, 192); dv.setUint16(198, 16); dv.setUint16(200, 256);
  dv.setUint32(204, compressed.length);
  compressed.forEach((n, i) => {const x = 255 - n; out[208 + i] = ((x << 3) & 255) + (x >> 5);});
  return out;
}

test('G3P decodes an independently constructed CP0001 DEFLATE/Adler32 fixture', async () => {
  const original = picturePixels(), picture = await parseG3P(nativePicture(original));
  assert.equal(picture.width, 384); assert.equal(picture.height, 192); assert.equal(picture.bitDepth, 16);
  assert.deepEqual(picture.pixels, original);
  assert.equal((await parseCasioFile(nativePicture())).format, 'g3p');
});

test('G3P export has native size/integrity fields and inflates independently with Node zlib', async () => {
  const pixels = picturePixels(), encoded = await encodeG3P({pixels});
  assert.equal(parseCasioHeader(encoded).kind, 'picture'); assert.equal(dataView(encoded).getUint32(204), encoded.length - 208);
  const compressed = encoded.slice(208).map(n => 255 - ((n >> 3) | ((n & 7) << 5)));
  assert.deepEqual(new Uint8Array(inflateSync(compressed)), pixels);
  assert.deepEqual((await parseG3P(encoded)).pixels, pixels);
});

test('G3P rejects bad checksums, decompression overrun, missing pixels and unknown flags/variants', async () => {
  const corrupt = nativePicture(); corrupt[corrupt.length - 1] ^= 1;
  await assert.rejects(parseG3P(corrupt), /DEFLATE/);
  const metadata = nativePicture(); metadata[0x40] = 1;
  await assert.rejects(parseG3P(metadata), /metadata or footer/);
  const depth = nativePicture(); dataView(depth).setUint16(198, 3);
  await assert.rejects(parseG3P(depth), /pixel format/);
  const length = nativePicture(); dataView(length).setUint32(204, 5);
  await assert.rejects(parseG3P(length), /nested G3P size/);
  await assert.rejects(parseG3P(nativePicture(new Uint8Array(147457))), /exceeds the expected size/);
  await assert.rejects(parseG3P(nativePicture(new Uint8Array(10))), /pixel byte count/);
  await assert.rejects(encodeG3P({pixels: new Uint8Array(10)}), /147456/);
});

test('RGB565 conversion preserves exact primary colors, big-endian order and complete pixel bounds', () => {
  const packed = hex('F8 00 07 E0 00 1F FF FF 00 00');
  const rgba = Uint8ClampedArray.of(255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255);
  assert.deepEqual(rgb565ToRGBA(packed), rgba); assert.deepEqual(rgbaToRGB565(rgba), packed);
  assert.throws(() => rgb565ToRGBA([1]), /whole 16-bit/); assert.throws(() => rgbaToRGB565([1, 2]), /four-byte/);
});

test('recognized eActivity headers remain explicitly unsupported, never disguised JSON imports', async () => {
  const eact = nativeHeader(32, 0x49);
  assert.equal(parseCasioHeader(eact).kind, 'eactivity');
  await assert.rejects(parseCasioFile(eact), /payload decoding is not implemented.*not imported/);
  await assert.rejects(parseCasioFile(new TextEncoder().encode('{"lines":[]}')), /Truncated CASIO/);
});
