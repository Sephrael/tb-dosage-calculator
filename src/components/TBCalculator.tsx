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
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [rrt, setRrt] = useState<RenalReplacement>('');

  const inputs: DosingInputs = {
    gender,
    weight: toNumberInput(weight),
    height: toNumberInput(height),
    age: toNumberInput(age),
    creatinine: toNumberInput(creatinine),
    rrt,
  };

  const result = useMemo(() => calculate(inputs), [
    gender,
    weight,
    height,
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
      <Label>Weight(kg)</Label>
      <NumberField id="weight" value={weight} onChange={setWeight} step="any" />

      {/* Height */}
      <Label>Height(cm)</Label>
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
