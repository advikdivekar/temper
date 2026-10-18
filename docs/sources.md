# Where the numbers come from

Everything the engine and the reference data rely on, with its source and
how far it is verified. Update this file whenever a source changes.

## Default values (EU)

- Source: Commission Implementing Regulation (EU) 2026/1740, Annex I. It
  corrects and replaces Annexes I and IV of IR (EU) 2025/2621 in full and
  applies from 1 January 2026.
- Loaded from the Commission's Excel file (version 2, 06.08.2026) into
  `data/default_values.json`. The Commission says the file is
  informational, so check values against the regulation before real use.
- Iron and steel and aluminium only. Direct emissions only (indirect is N/A).
- Mark-ups: 10 percent in 2026, 20 percent in 2027, 30 percent from 2028
  (confirmed for iron, steel and aluminium; Commission page notes a consolidated
  IR 2025/2621 text is coming and should become the single reference).
- India: 7318 15 threaded screws and bolts 5.720, 7318 16 nuts 5.140
  (base, before mark-up).

## Emission factors

- Natural gas 56.1 tCO2/TJ: confirmed, used in Guidance No. 5d Table 4-12.
- Coal (94.6 tCO2/TJ, 25.8 TJ/Gg), diesel (74.1 tCO2/TJ): IPCC 2006 defaults
  from memory. Check against Annex II section G of IR (EU) 2025/2547.
  Indian coal has a lower calorific value, so it may need measuring.
- Grid: not needed for iron and steel. 0.727 tCO2/MWh (CEA FY2023-24) is from
  a secondary report and unverified.

## Method (confirmed in Guidance No. 3, August 2026)

- The functional unit is the tonne of goods of the same CN code.
- Several products in one plant: outputs are split pro rata by tonnes.
- Mass is used only where molar masses of a co-product are unknown.
- Chapter 73 CN codes can be grouped in one multifunctional process.
- Attributed direct emissions that come out negative are set to zero.

## Golden tests (engine/tests/test_golden_examples.py)

- Guidance No. 5d Example 3: screws and nuts from purchased steel rods.
  Carbon steel 2.039, alloy steel 2.371 tCO2 per tonne (within 0.0015).
- Guidance No. 3 section 4.3.3: cement attribution by clinker content.
  Grey 0.820, white 0.845, mixed 0.837 tCO2 per tonne.

## Not yet verified

- Section G of Annex II (fuel factors) and the CEA guide.
- Aluminium mark-up percentages: now CONFIRMED at 10, 20, 30 percent.
- Free allocation adjustment (savings figures ignore it).

## Cross check, India rows
Base values for 7318 15, 7318 16, 7318 22 00, 7208, 7213/7214, 7601, 7616 10 00
match an independent reading of the Excel (v2, 6 Aug 2026). Still to check
against the IR 2026/1740 PDF: the 7318 15 and 7318 16 rows. The Excel is
informational only; the regulation is the binding text.
