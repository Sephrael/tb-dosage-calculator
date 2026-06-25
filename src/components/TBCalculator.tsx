import { useMemo, useState } from 'react';
import {
  calculate,
  PENDING,
  type DosingInputs,
  type Gender,
  type RenalReplacement,
  type NumberInput,
} from '../lib/dosing';

/** Parse a text input into a CFF NumberInput ('' when blank, Number otherwise). */
function toNumberInput(raw: string): NumberInput {
  return raw === '' ? '' : Number(raw);
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mt-4 block text-[15px] text-gray-900">{children}</label>;
}

/** Read-only calculated result, styled like the original CFF output boxes. */
function Result({ value }: { value: string }) {
  const isPlaceholder = value === '' || value === PENDING;
  return (
    <div
      className={
        'mt-1 min-h-[2.6rem] w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-[15px] ' +
        (isPlaceholder ? 'text-gray-400' : 'text-gray-800')
      }
    >
      {value === '' ? ' ' : value}
    </div>
  );
}

// Unit conversion. The dosing math always runs in kg/cm; these only convert the
// user's typed value. Exact factors: 1 lb = 0.45359237 kg, 1 in = 2.54 cm.
const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

type WeightUnit = 'kg' | 'lb';
type HeightUnit = 'cm' | 'in';

/**
 * Round a converted value for display, dropping trailing zeros. Uses 2 decimals
 * so a unit round-trip (kg -> lb -> kg) doesn't drift enough to shift the
 * 1-decimal clinical outputs (BMI, CrCl, etc.).
 */
function fmtConvert(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** A small inline segmented control to switch a field's unit. */
function UnitToggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly [T, T];
  onChange: (u: T) => void;
  label: string;
}) {
  return (
    <span
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 overflow-hidden rounded border border-gray-300 text-xs leading-none"
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={opt === value}
          onClick={() => onChange(opt)}
          className={
            'px-2 py-1 ' +
            (opt === value
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100')
          }
        >
          {opt}
        </button>
      ))}
    </span>
  );
}

/** A label row that keeps text and an inline unit toggle aligned. */
function UnitLabel({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-2 text-[15px] text-gray-900">
      <span>{text}</span>
      {children}
    </div>
  );
}

/** A numeric text input matching the original small/medium field sizing. */
function NumberField({
  id,
  value,
  onChange,
  step,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 block w-52 rounded border border-gray-300 bg-white px-3 py-2 text-[15px] text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400"
    />
  );
}

export default function TBCalculator() {
  const [gender, setGender] = useState<Gender>('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [age, setAge] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [rrt, setRrt] = useState<RenalReplacement>('');

  // Switching units converts the currently-typed value so the real measurement
  // is preserved (e.g. 100 kg -> 220.5 lb).
  function changeWeightUnit(u: WeightUnit) {
    if (u === weightUnit) return;
    if (weight !== '' && !Number.isNaN(Number(weight))) {
      const kg = weightUnit === 'kg' ? Number(weight) : Number(weight) * KG_PER_LB;
      setWeight(fmtConvert(u === 'kg' ? kg : kg / KG_PER_LB));
    }
    setWeightUnit(u);
  }
  function changeHeightUnit(u: HeightUnit) {
    if (u === heightUnit) return;
    if (height !== '' && !Number.isNaN(Number(height))) {
      const cm = heightUnit === 'cm' ? Number(height) : Number(height) * CM_PER_IN;
      setHeight(fmtConvert(u === 'cm' ? cm : cm / CM_PER_IN));
    }
    setHeightUnit(u);
  }

  // Always feed the dosing math in kg/cm, regardless of the chosen display unit.
  const weightKg: NumberInput =
    weight === '' ? '' : weightUnit === 'kg' ? Number(weight) : Number(weight) * KG_PER_LB;
  const heightCm: NumberInput =
    height === '' ? '' : heightUnit === 'cm' ? Number(height) : Number(height) * CM_PER_IN;

  const inputs: DosingInputs = {
    gender,
    weight: weightKg,
    height: heightCm,
    age: toNumberInput(age),
    creatinine: toNumberInput(creatinine),
    rrt,
  };

  const result = useMemo(() => calculate(inputs), [
    gender,
    weight,
    weightUnit,
    height,
    heightUnit,
    age,
    creatinine,
    rrt,
  ]);

  return (
    <div className="text-gray-900">
      {/* Gender */}
      <Label>Gender</Label>
      <div className="mt-1 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-[15px]">
          <input
            type="radio"
            name="gender"
            checked={gender === '1'}
            onChange={() => setGender('1')}
          />
          Male
        </label>
        <label className="flex items-center gap-2 text-[15px]">
          <input
            type="radio"
            name="gender"
            checked={gender === '2'}
            onChange={() => setGender('2')}
          />
          Female
        </label>
      </div>

      {/* Weight */}
      <UnitLabel text={weightUnit === 'kg' ? 'Weight(kg)' : 'Weight(lb)'}>
        <UnitToggle
          value={weightUnit}
          options={['kg', 'lb']}
          onChange={changeWeightUnit}
          label="Weight units"
        />
      </UnitLabel>
      <NumberField id="weight" value={weight} onChange={setWeight} step="any" />

      {/* Height */}
      <UnitLabel text={heightUnit === 'cm' ? 'Height(cm)' : 'Height(in)'}>
        <UnitToggle
          value={heightUnit}
          options={['cm', 'in']}
          onChange={changeHeightUnit}
          label="Height units"
        />
      </UnitLabel>
      <NumberField id="height" value={height} onChange={setHeight} step="any" />

      {/* BMI (calculated) */}
      <Label>BMI</Label>
      <Result value={result.bmi} />

      {/* Lean Body Weight (calculated) */}
      <Label>Lean Body Weight(James Equation)</Label>
      <Result value={result.leanBodyWeight} />

      {/* Section break: CrCl */}
      <div className="mt-6 border-t border-dotted border-gray-400 pt-4" />
      <p className="text-[15px] text-gray-900">
        Include the following to calculate Creatinine Clearance(eGFR) using Cockroft-Gault equation
      </p>

      {/* Age */}
      <Label>Age(yr)</Label>
      <NumberField id="age" value={age} onChange={setAge} step="1" />

      {/* Creatinine */}
      <Label>Creatinine(mg/dL)</Label>
      <NumberField id="creatinine" value={creatinine} onChange={setCreatinine} step="any" />

      {/* Renal replacement therapy */}
      <Label>Receiving renal replacement therapy?(e.g. dialysis)</Label>
      <div className="mt-1 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-[15px]">
          <input type="radio" name="rrt" checked={rrt === 'Yes'} onChange={() => setRrt('Yes')} />
          Yes
        </label>
        <label className="flex items-center gap-2 text-[15px]">
          <input type="radio" name="rrt" checked={rrt === 'No'} onChange={() => setRrt('No')} />
          No
        </label>
      </div>

      {/* CrCl (calculated) — medium width to match original */}
      <Label>Calculated CrCl using Cockroft-Gault equation</Label>
      <div className="max-w-md">
        <Result value={result.crcl} />
      </div>

      {/* Section break (blank) */}
      <div className="mt-6 border-t border-dotted border-gray-400 pt-2" />

      {/* Renal Replacement Correction (calculated text) */}
      <Label>Renal Replacement Correction</Label>
      <Result value={result.renalCorrection} />

      {/* Pyrazinamide */}
      <Label>Pyrazinamide Dose Range</Label>
      <Result value={result.pyrazinamideRange} />

      <Label>Recommended Pyrazinamide Prescription</Label>
      <Result value={result.pyrazinamidePrescription} />

      {/* Ethambutol */}
      <Label>Ethambutol Dose Range</Label>
      <Result value={result.ethambutolRange} />

      <Label>Recommended Ethambutol Prescription</Label>
      <Result value={result.ethambutolPrescription} />
    </div>
  );
}
