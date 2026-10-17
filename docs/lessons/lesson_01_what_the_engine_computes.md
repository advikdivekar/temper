# Lesson 1: What the engine computes

## The goal
For one product (say, a steel bolt), find the carbon emitted per tonne.
This is called specific embedded emissions (SEE).

## Two parts
1. Direct emissions: fuel burned at the plant (gas, diesel, coal).
   Formula: fuel quantity x energy content x emission factor.
2. Indirect emissions: electricity used.
   Formula: kWh used x grid emission factor.

Plus precursors: the steel you bought already carries emissions.
You add the supplier's per tonne figure times the tonnes of steel used,
or the EU default value if the supplier has no verified figure.

## Splitting across products
A plant makes several products from the same fuel and electricity.
The total must be divided between them (allocation), and the parts
must add back to the total. This is a property we test automatically.

## Why Decimal and not float
Floats store 0.1 as an approximation, so sums drift. Audits need exact,
repeatable results, so we use Python's Decimal type.

## Why units are checked
Adding kWh to tonnes is a bug that silently ruins a number. We make
quantities carry their unit and refuse invalid mixes.

## Why golden tests
The EU publishes worked examples. Our engine must reproduce them exactly.
These are the definition of correct.

## Next step
Build `engine/certify_engine/quantity.py`: a number with a unit.
