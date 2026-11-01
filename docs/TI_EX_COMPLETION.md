# TI and EX feature completion

TI-36X Pro now has functional SET OP / OP storage, repeated execution with an
iteration count, a mixed-number entry template on 2nd 7, all 40 conversion
directions in the five TI categories, persistent LCD contrast, and a reset of
the current calculator profile. The old `[ ]` label over 7 was a transcription
error: it is the mixed-number entry template.

The stored operation is an expression suffix with a 44-character limit. For
example SET OP `*2+3`, current entry `4`, OP gives `11`; another OP gives `25`.
An entry of `6` starts a new count and gives `15`. An undefined OP reports
`OP NOT DEFINED`. SET OP accepts an empty field to clear the operation; CLEAR
while editing also clears that field. Operators, variables and functions use
the existing validated calculator engine, with approximate-result provenance.

Conversion units use explicit physical definitions and affine temperature
conversion. The calorie is the international steam table calorie (4.1868 J);
the parsec uses the modern astronomical-unit definition. This is mathematical
software, so old handheld firmware's last-digit rounding is not reproduced.
LCD contrast changes are a visible software simulation of screen contrast.

EX SHIFT OPTN now generates scannable QR codes carrying the actual expression,
answer, error or data rows. Its title and payload explicitly identify
`scientific calculator simulator`. Long text is paged without splitting UTF-8
characters. ENTER or down advances pages; up returns; AC or SHIFT OPTN exits;
left/right adjust QR contrast. The underlying content is also visible as text.
When no result/data is present the payload includes the official user-manual
URL. No data is uploaded to produce a QR code.

CASIO documents that its physical calculator QR links carry data to CASIO's
service, but the public manual does not document the proprietary data encoding
or authentication. The simulator therefore exports ordinary result text; it
does not fabricate WES URLs or claim manufacturer QR/authenticity compatibility.
Viewing a graph locally uses the simulator's graphing application.

References:

- [TI-36X Pro guidebook](https://education.ti.com/html/eguides/scientifics/PDFs/EN/TI-36X-PRO-Guidebook_EN.pdf), pp.3, 13–14, 30–31, 66–68.
- [TI support solution 30130](https://education.ti.com/en/customer-support/knowledge-base/scientific-elem-calculators/product-usage/30130), explicitly identifies the mixed-number template above 7 and reset behavior.
- [CASIO fx-570EX/fx-991EX manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991EX_EN.pdf), QR Code Function, p.17.
