/* Native byte formats, independently implemented from published format facts.
 * Sources: https://cahute.org/topics/file-formats/mainmem.html
 * https://cahute.org/topics/text-encodings.html
 * https://www.cemetech.net/forum/viewtopic.php?t=10560 (original investigator)
 * Payloads in a G3M archive remain opaque: this does not translate program
 * tokens, spreadsheet records, graph settings or native eActivity strips.
 */

export const CASIO_FILE_LIMIT = 16 * 1024 * 1024;
const MAGIC = [0x55, 0x53, 0x42, 0x50, 0x6f, 0x77, 0x65, 0x72];
const LEADERS = {legacy: new Set([0x00, 0x7f, 0xf7]), '9860': new Set([0x00, 0x7f, 0xe5, 0xe6, 0xe7, 0xf7, 0xf9])};
const fail = message => { throw new Error(message); };
const requireValue = (condition, message) => { if (!condition) fail(message); };
const bytes = value => {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value) && value.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) return Uint8Array.from(value);
  return fail('Expected binary bytes, not text or JSON');
};
const view = value => new DataView(value.buffer, value.byteOffset, value.byteLength);
const u16 = (value, offset) => view(value).getUint16(offset);
const u32 = (value, offset) => view(value).getUint32(offset);
const set16 = (value, offset, number) => view(value).setUint16(offset, number);
const set32 = (value, offset, number) => view(value).setUint32(offset, number);
const match = (value, offset, expected) => expected.every((n, i) => value[offset + i] === n);
const bounded = value => {
  const data = bytes(value);
  requireValue(data.length <= CASIO_FILE_LIMIT, 'CASIO file exceeds the 16 MiB import limit');
  return data;
};

// Six original fx-CG50 BASIC exports published by abppbd (Unlicense) independently
// establish the 0x11/0x17 producer profile. The earlier simulator-only profile is
// decode-compatible, but is never selected for a new main-memory archive.
export const CASIO_CG_HEADER_PROFILES=Object.freeze([
  Object.freeze({id:'cg50-public-basic-exports',subtype:0x75,salt28:0x11,salt29:0x17,source:'abppbd/Casio-Basic-Games: six original G3M/TXT pairs'}),
  Object.freeze({id:'simulator-legacy-main-memory',subtype:0x75,salt28:0xa3,salt29:0x85,source:'Compatibility with earlier simulator-generated archives'}),
  Object.freeze({id:'cg-picture-published',subtype:0x7d,salt28:0x9b,salt29:0x85,source:'Published fx-CG picture envelope observations'}),
]);
function cgHeaderProfile(header,subtype){return CASIO_CG_HEADER_PROFILES.find(profile=>profile.subtype===subtype&&header[28]===((header[18]+header[19]+profile.salt28)&255)&&header[29]===((header[19]+profile.salt29)&255));}

/** Validate the standard envelope only. A recognized header does not decode its payload. */
export function parseCasioHeader(value) {
  const data = bounded(value);
  requireValue(data.length >= 32, 'Truncated CASIO standard header');
  requireValue(MAGIC.every((n, i) => data[i] === (n ^ 255))
    && match(data, 9, [255, 239, 255, 239, 255]), 'Unrecognized CASIO file signature');
  const subtype = data[8] ^ 255;
  const byteLength = (u32(data, 16) ^ 0xffffffff) >>> 0;
  requireValue(byteLength === data.length, 'CASIO file size field does not match the supplied bytes');
  requireValue(data[14] === (((byteLength + 0x41) & 255) ^ 255)
    && data[20] === (((byteLength + 0xb8) & 255) ^ 255), 'Invalid CASIO header control bytes');
  const kind = subtype === 0x75 ? 'main-memory' : subtype === 0x7d ? 'picture' : subtype === 0x49 ? 'eactivity' : 'unsupported';
  const profile=subtype===0x75||subtype===0x7d?cgHeaderProfile(data,subtype):null;
  if (subtype === 0x75 || subtype === 0x7d) requireValue(profile, 'Invalid fx-CG header integrity bytes');
  return {kind, subtype, byteLength, objectCount: u16(data, 30) ^ 0xffff, bytes: data.slice(0, 32),...(profile?{producerProfile:profile.id,profileSource:profile.source}:{})};
}

function createCGHeader(subtype, size, count,template) {
  let profile;if(template){requireValue(template.length===32&&MAGIC.every((n,i)=>template[i]===(n^255))&&(template[8]^255)===subtype,'Invalid original CASIO header template');const oldSize=(u32(template,16)^0xffffffff)>>>0;requireValue(template[14]===(((oldSize+0x41)&255)^255)&&template[20]===(((oldSize+0xb8)&255)^255),'Invalid original CASIO header control bytes');profile=cgHeaderProfile(template,subtype);requireValue(profile,'Invalid original fx-CG producer profile');}else profile=CASIO_CG_HEADER_PROFILES.find(profile=>profile.subtype===subtype);
  const out = template?template.slice():new Uint8Array(32);
  MAGIC.forEach((n, i) => out[i] = n ^ 255);
  out.set([subtype ^ 255, 255, 239, 255, 239, 255], 8);
  out[14] = ((size + 0x41) & 255) ^ 255;
  if(!template)out[15] = 0xfe;
  set32(out, 16, (size ^ 0xffffffff) >>> 0);
  out[20] = ((size + 0xb8) & 255) ^ 255;
  if(!template)out[21] = subtype === 0x75 ? 1 : 0;
  out[28] = (out[18] + out[19] + profile.salt28) & 255;
  out[29] = (out[19] + profile.salt29) & 255;
  set16(out, 30, count ^ 0xffff);
  return out;
}

function fixedName(value, size, label) {
  if (typeof value === 'string') {
    requireValue(value.length <= size && /^[\x20-\x7e]*$/.test(value), label + ' must fit ' + size + ' ASCII bytes; use raw name bytes for native characters');
    const result = new Uint8Array(size);
    for (let i = 0; i < value.length; i++) result[i] = value.charCodeAt(i);
    return result;
  }
  const result = bytes(value);
  requireValue(result.length === size, label + ' requires exactly ' + size + ' raw bytes');
  return result;
}

// Display only: native character/token bytes are kept separately and never
// silently treated as Unicode. Even ASCII-looking native punctuation can differ.
function displayName(value) {
  let text = '';
  for (const n of value) {
    if (n === 0 || n === 255) break;
    text += n >= 32 && n <= 126 ? String.fromCharCode(n) : '\\x' + n.toString(16).padStart(2, '0');
  }
  return text;
}

/** Decode a complete G3M envelope; every native record payload is preserved. */
export function parseG3M(value) {
  const data = bounded(value), header = parseCasioHeader(data);
  requireValue(header.subtype === 0x75, 'Expected an fx-CG main-memory archive (.g3m/.g3r)');
  let offset = 32, total = 0;
  const groups = [];
  while (total < header.objectCount) {
    requireValue(offset + 20 <= data.length, 'Truncated G3M group header');
    const nameBytes = data.slice(offset, offset + 16), count = u32(data, offset + 16);
    requireValue(count > 0 && count <= header.objectCount - total, 'G3M group count exceeds the archive object count');
    offset += 20;
    const files = [];
    for (let i = 0; i < count; i++) {
      requireValue(offset + 24 <= data.length, 'Truncated G3M record header');
      const directoryBytes = data.slice(offset, offset + 8), fileNameBytes = data.slice(offset + 8, offset + 16);
      const type = data[offset + 16], length = u32(data, offset + 17), reservedBytes = data.slice(offset + 21, offset + 24);
      offset += 24;
      requireValue(length <= data.length - offset, 'Truncated or invalid G3M record length');
      files.push({name: displayName(fileNameBytes), directory: displayName(directoryBytes), nameBytes: fileNameBytes, directoryBytes, type, reservedBytes, data: data.slice(offset, offset + length)});
      offset += length;
    }
    groups.push({name: displayName(nameBytes), nameBytes, files});
    total += count;
  }
  requireValue(offset === data.length, 'Unexpected trailing bytes after the G3M objects');
  return {format: 'g3m', header, groups};
}

/** Encode real archive bytes. Native record semantics must be provided by caller. */
export function encodeG3M(archive) {
  requireValue(archive && Array.isArray(archive.groups), 'G3M groups are required');
  let count = 0, size = 32;
  const groups = archive.groups.map(group => {
    requireValue(group && Array.isArray(group.files) && group.files.length > 0, 'G3M groups must contain at least one file');
    const name = fixedName(group.nameBytes ?? group.name, 16, 'Group name');
    size += 20;
    const files = group.files.map(file => {
      const directory = fixedName(file.directoryBytes ?? file.directory ?? 'system', 8, 'Directory name');
      const name = fixedName(file.nameBytes ?? file.name, 8, 'File name');
      requireValue(Number.isInteger(file.type) && file.type >= 0 && file.type <= 255, 'Native record type must be a byte');
      const payload = bytes(file.data), reserved = file.reservedBytes === undefined ? new Uint8Array(3) : bytes(file.reservedBytes);
      requireValue(reserved.length === 3, 'G3M record reserved field requires 3 bytes');
      size += 24 + payload.length; count++;
      requireValue(size <= CASIO_FILE_LIMIT && count <= 65535, 'G3M archive exceeds the size or object-count limit');
      return {directory, name, type: file.type, payload, reserved};
    });
    return {name, files};
  });
  const out = new Uint8Array(size);
  out.set(createCGHeader(0x75, size, count,archive.header?.bytes===undefined?undefined:bytes(archive.header.bytes)));
  let offset = 32;
  for (const group of groups) {
    out.set(group.name, offset); set32(out, offset + 16, group.files.length); offset += 20;
    for (const file of group.files) {
      out.set(file.directory, offset); out.set(file.name, offset + 8); out[offset + 16] = file.type;
      set32(out, offset + 17, file.payload.length); out.set(file.reserved, offset + 21); offset += 24;
      out.set(file.payload, offset); offset += file.payload.length;
    }
  }
  return out;
}

/** Convert native FONTCHARACTER codes, not their Unicode/editor meanings. */
export function decodeCasioCodes(value, {encoding = 'variable', table = '9860'} = {}) {
  const data = bounded(value), result = [];
  requireValue(Object.hasOwn(LEADERS, table), 'Unknown CASIO character table');
  requireValue(['variable', 'be16', 'le16'].includes(encoding), 'Unknown CASIO byte encoding');
  if (encoding !== 'variable') {
    requireValue(data.length % 2 === 0, 'Truncated fixed-width CASIO character');
    for (let i = 0; i < data.length; i += 2) result.push(view(data).getUint16(i, encoding === 'le16'));
  } else {
    for (let i = 0; i < data.length; i++) {
      const first = data[i];
      if (LEADERS[table].has(first)) {
        requireValue(i + 1 < data.length, 'Truncated multibyte CASIO character');
        result.push((first << 8) | data[++i]);
      } else result.push(first);
    }
  }
  return result;
}

export function encodeCasioCodes(codes, {encoding = 'variable', table = '9860'} = {}) {
  requireValue(Object.hasOwn(LEADERS, table), 'Unknown CASIO character table');
  requireValue(['variable', 'be16', 'le16'].includes(encoding), 'Unknown CASIO byte encoding');
  requireValue(Array.isArray(codes) || codes instanceof Uint16Array, 'Expected native CASIO character codes');
  requireValue(codes.length <= CASIO_FILE_LIMIT / 2, 'CASIO character sequence exceeds the size limit');
  const out = [];
  for (const code of codes) {
    requireValue(Number.isInteger(code) && code >= 0 && code <= 65535, 'Native character code must be a 16-bit integer');
    if (encoding === 'be16') out.push(code >> 8, code & 255);
    else if (encoding === 'le16') out.push(code & 255, code >> 8);
    else if (code > 255 || LEADERS[table].has(code)) {
      requireValue(LEADERS[table].has(code >> 8), 'Character code has no variable-width representation in this table');
      out.push(code >> 8, code & 255);
    } else out.push(code);
  }
  return Uint8Array.from(out);
}

async function compressedBytes(data, decompress, limit) {
  const Constructor = decompress ? globalThis.DecompressionStream : globalThis.CompressionStream;
  requireValue(typeof Constructor === 'function', 'This runtime does not provide native DEFLATE streams');
  const reader = new Blob([data]).stream().pipeThrough(new Constructor('deflate')).getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.length;
      if (size > limit) { await reader.cancel(); fail('G3P decompressed/compressed data exceeds the expected size'); }
      chunks.push(next.value);
    }
  } catch (error) { fail('Invalid G3P DEFLATE stream: ' + error.message); }
  finally { reader.releaseLock(); }
  const out = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

const obfuscate = n => { const inverted = n ^ 255; return ((inverted << 3) | (inverted >> 5)) & 255; };
const unobfuscate = n => (((n >> 3) | (n << 5)) & 255) ^ 255;

/** Decode the published footer-free CP0001 RGB565 image variant only. */
export async function parseG3P(value) {
  const data = bounded(value), header = parseCasioHeader(data);
  requireValue(header.subtype === 0x7d, 'Expected an fx-CG picture (.g3p)');
  requireValue(data.length >= 0xd0, 'Truncated G3P image header');
  requireValue(match(data, 0x20, [0x43, 0x50, 0, 1, 0, 0])
    && u32(data, 0x34) === 1 && u32(data, 0xb8) === 0x00010000, 'Unsupported G3P variant; only footer-free CP0001 is decoded');
  requireValue(data.subarray(0x26, 0x30).every(n => n === 0) && data.subarray(0x3c, 0xb8).every(n => n === 0), 'Unsupported G3P metadata or footer flags');
  requireValue(u32(data, 0x30) === data.length - 0x20 && u32(data, 0x38) === data.length - 0xb8
    && u32(data, 0xbc) === data.length - 0xcc && u32(data, 0xcc) === data.length - 0xd0, 'Invalid nested G3P size fields');
  const width = u16(data, 0xc2), height = u16(data, 0xc4), bitDepth = u16(data, 0xc6);
  requireValue(width === 384 && height === 192 && bitDepth === 16, 'Unsupported G3P pixel format; expected 384×192 RGB565');
  requireValue(u16(data, 0xc0) === 0 && u16(data, 0xc8) === 0x100 && u16(data, 0xca) === 0, 'Unsupported G3P image flags');
  const compressed = data.slice(0xd0).map(unobfuscate);
  const pixels = await compressedBytes(compressed, true, width * height * 2);
  requireValue(pixels.length === width * height * 2, 'G3P pixel byte count does not match its dimensions');
  return {format: 'g3p', variant: 'CP0001', width, height, bitDepth, pixels};
}

/** RGB565 pixels are row-major big-endian bytes; no vendor artwork is included. */
export async function encodeG3P(picture) {
  requireValue(picture && (picture.width ?? 384) === 384 && (picture.height ?? 192) === 192
    && (picture.bitDepth ?? 16) === 16, 'G3P export supports 384×192 RGB565 only');
  const pixels = bytes(picture.pixels);
  requireValue(pixels.length === 384 * 192 * 2, 'G3P export requires exactly 147456 RGB565 bytes');
  const compressed = await compressedBytes(pixels, false, CASIO_FILE_LIMIT - 0xd0);
  const out = new Uint8Array(0xd0 + compressed.length);
  out.set(createCGHeader(0x7d, out.length, 65535));
  out.set([0x43, 0x50, 0, 1, 0, 0], 0x20);
  set32(out, 0x30, out.length - 0x20); set32(out, 0x34, 1); set32(out, 0x38, out.length - 0xb8);
  set32(out, 0xb8, 0x10000); set32(out, 0xbc, out.length - 0xcc);
  set16(out, 0xc2, 384); set16(out, 0xc4, 192); set16(out, 0xc6, 16); set16(out, 0xc8, 0x100);
  set32(out, 0xcc, compressed.length); out.set(compressed.map(obfuscate), 0xd0);
  return out;
}

export function rgb565ToRGBA(value) {
  const pixels = bounded(value);
  requireValue(pixels.length % 2 === 0, 'RGB565 pixel data requires whole 16-bit pixels');
  const out = new Uint8ClampedArray(pixels.length * 2);
  for (let i = 0; i < pixels.length / 2; i++) {
    const code = u16(pixels, i * 2), r = code >> 11, g = (code >> 5) & 63, b = code & 31;
    out.set([(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2), 255], i * 4);
  }
  return out;
}

export function rgbaToRGB565(value) {
  const rgba = bounded(value);
  requireValue(rgba.length % 4 === 0, 'RGBA data requires complete four-byte pixels');
  const out = new Uint8Array(rgba.length / 2);
  for (let i = 0; i < rgba.length / 4; i++) set16(out, i * 2, ((rgba[i * 4] >> 3) << 11) | ((rgba[i * 4 + 1] >> 2) << 5) | (rgba[i * 4 + 2] >> 3));
  return out;
}

/** File-picker entry point: await parseCasioFile(await file.arrayBuffer()). */
export async function parseCasioFile(value) {
  const header = parseCasioHeader(value);
  if (header.kind === 'main-memory') return parseG3M(value);
  if (header.kind === 'picture') return parseG3P(value);
  if (header.kind === 'eactivity') fail('Native eActivity payload decoding is not implemented; the file was not imported');
  return fail('Unsupported CASIO container subtype 0x' + header.subtype.toString(16));
}
