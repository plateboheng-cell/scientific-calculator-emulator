# Public original main-memory fixtures

The six `.g3m` files and matching `.txt` files are unchanged exports published by
[abppbd / Casio-Basic-Games](https://github.com/abppbd/Casio-Basic-Games), tree
`3fd6f83cdae69a4b7ae315c133540f085461e991`. The author's Unlicense is included as
`LICENSE-Unlicense.txt`. These are public calculator BASIC games, not ROM images.

| File | Original Git blob (G3M) | Bytes |
| --- | --- | ---: |
| PONG | a8d286ba4ee02e45154eb2e78b7af17bbb58ac6f | 832 |
| CONNECT4 | 7b2f77130e5bb1714d5c4eb667fbb443328ecd50 | 1552 |
| 3DRENDER | 5ce12b60c30a10747e81af1e89994a5baaed0cfb | 1696 |
| MINESWPR | 599ef792f59c449b0732492375c88fd593215a8d | 2544 |
| SNAKE | 1f7b6397fe29c3c9fe26dc51d9840ded048bacd6 | 1756 |
| TICTACTO | bb6a13b99052949022ffe6c2af27c2005409c53b | 1624 |

Each has one PROGRAM record. All six original author archives satisfy the
on-disk producer checks `byte28=(byte18+byte19+0x11)&255` and
`byte29=(byte19+0x17)&255`. The codec labels this observed profile rather than
accepting arbitrary integrity bytes. The earlier simulator-only `0xA3/0x85`
profile is retained for decode compatibility and unchanged re-export.

The tests verify the original Git blob hashes, the complete matching TXT exports
(normalizing their token/glyph escape spellings), newly re-lexed token sequences,
and byte-identical archive preservation. No input is modified to satisfy the
decoder.

The samples do **not** contain List/Mat/Vct/SETUP/String records. The independent
implementation of numeric and array payloads is checked against hand-assembled
vectors using the published facts in Thomas Touhey's
[libcasio format headers](https://github.com/Lailouezzz/libcasio/tree/master/include/libcasio/format/mcs)
and [Cahute number-format documentation](https://cahute.org/topics/number-formats.html).
No copyleft implementation or complete token table was copied into the product.
The limited token facts used here are also cross-checked against the paired
original TXT files. Neither constructed vectors nor opening a menu constitutes
hardware compatibility testing.

Unknown program tokens, nondecimal numeric variants, native strings and
unverified compound/polar alpha-memory mappings remain opaque and are retained
in the original archive. New SETUP data cannot be invented without a template.
Native list element color metadata has not been mapped to application colors;
original unknown extension bytes are preserved instead.

Current-memory export treats explicitly supplied runtime banks as snapshots:
deleted programs, emptied lists in all six List Files, removed arrays and
cleared answer banks remove their previously decoded native records. Opaque
records and unselected record kinds are retained. Supplying only an original
archive performs native SAVE and preserves its bytes without applying runtime
deletion semantics.

A separate local cross-check ran Sheikh Humaid AlQassimi's public MIT
`g1m-decompiler` on a newly generated program. It independently recognized the
native name, assignment, arithmetic and display token bytes. That older reader
has incomplete token mappings and does not validate fx-CG producer headers, so
it is not claimed as a complete file or firmware validator.
