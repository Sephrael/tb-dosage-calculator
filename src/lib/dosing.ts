/**
 * TB Drug Dosage Calculator — pure dosing logic.
 *
 * SOURCE OF TRUTH: the "Cloned: TB&CrCl Drug Calculator" form (id=9) from the
 * WordPress "Calculated Fields Form" (CFF) plugin export
 * (`wpri_cp_calculated_fields_form_settings.sql`), cross-checked against the
 * JavaScript embedded in the saved page HTML.
 *
 * Every equation below is a VERBATIM port of a CFF calculated field. The CFF
 * field name is noted on each function. Do not "improve", re-round, or refactor
 * the math — parity with the original is the whole point.
 *
 * CFF field map:
 *   fieldname3  (radio)  Gender                 -> 1 = Male, 2 = Female
 *   fieldname2  (number) Weight(kg)
 *   fieldname4  (number) Height(cm)
 *   fieldname17 (calc)   BMI
 *   fieldname1  (calc)   Lean Body Weight (James)   <- feeds all dosing
 *   fieldname10 (number) Age(yr)
 *   fieldname9  (number) Creatinine(mg/dL)
 *   fieldname16 (radio)  Receiving renal replacement therapy? -> 'Yes' / 'No'
 *   fieldname12 (calc)   Calculated CrCl (Cockcroft-Gault)
 *   fieldname13 (calc)   Renal Replacement Correction (text)
 *   fieldname6  (calc)   Pyrazinamide Dose Range
 *   fieldname14 (calc)   Recommended Pyrazinamide Prescription
 *   fieldname7  (calc)   Ethambutol Dose Range
 *   fieldname15 (calc)   Recommended Ethambutol Prescription
 */

/* ------------------------------------------------------------------ *
 * CFF helper functions (semantics per the official CFF documentation) *
 * ------------------------------------------------------------------ */

/**
 * CFF `pow(x, y)` — x to the power of y. Identical to Math.pow.
 */
export function pow(x: number, y: number): number {
  return Math.pow(x, y);
}

/**
 * CFF `floor(x)` / `floor(x, m)` — round x downwards to the nearest integer,
 * or (with the optional second argument) downwards to the nearest multiple of m.
 * The dosing equations only ever use the single-argument form.
 */
export function floor(x: number, multiple?: number): number {
  if (multiple === undefined) return Math.floor(x);
  return Math.floor(x / multiple) * multiple;
}

/**
 * CFF `prec(x, y)` — return x with y decimal digits.
 *   prec(10.33323, 2) -> "10.33"
 *   prec(10.3365, 2)  -> "10.34"   (round half up)
 *   prec(10, 2)       -> "10.00"   (trailing zeros kept)
 *   prec(3, 2, true)  -> "3"       (optional 3rd arg drops decimals when integer)
 *
 * Returns a string, exactly like CFF: when its result is concatenated into a
 * message it formats with fixed decimals; when it feeds another field the
 * downstream equation coerces it back to a number (see `toNumber`).
 *
 * NaN is preserved as the string "NaN" (matches Number.prototype.toFixed),
 * which lets the "no input yet" branches fall through to the predefined text.
 */
export function prec(x: number, y: number, dropDecimalsIfInteger = false): string {
  if (dropDecimalsIfInteger && Number.isInteger(x)) return String(x);
  return x.toFixed(y);
}

/* ------------------------------------------------------------------ *
 * Field-value coercion                                                *
 *                                                                     *
 * In CFF an empty numeric field behaves like JS `''`, which coerces   *
 * to 0 in the arithmetic operators used here (-, *, /, pow). We model *
 * empty inputs as `''` and convert with Number(), which gives 0 for   *
 * '' — byte-identical to the browser's behaviour.                     *
 * ------------------------------------------------------------------ */

export type Gender = '' | '1' | '2'; // '' = not selected, 1 = Male, 2 = Female
export type RenalReplacement = '' | 'Yes' | 'No';
/** A numeric input that may be left blank (blank coerces like JS `''`). */
export type NumberInput = number | '';

export interface DosingInputs {
  gender: Gender;
  weight: NumberInput; // kg
  height: NumberInput; // cm
  age: NumberInput; // yr
  creatinine: NumberInput; // mg/dL
  rrt: RenalReplacement; // receiving renal replacement therapy?
}

/** Coerce a (possibly blank) field value to a number the way JS would. */
function num(v: NumberInput): number {
  return Number(v); // Number('') === 0, matching CFF/JS empty-field arithmetic
}

/**
 * Coerce a calculated field's result to the number a *downstream* equation
 * would see. CFF passes the field's value through JS numeric coercion, which
 * reads the leading numeric portion — e.g. a Lean Body Weight result of
 * "60.5 - James equation unreliable..." is used as 60.5 in the dose maths.
 */
function toNumber(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return NaN;
  return parseFloat(String(v));
}

/* ================================================================== *
 * Calculated fields — verbatim ports                                  *
 * ================================================================== */

/**
 * fieldname17 — BMI.
 * Returns the display string (number, possibly with a monitoring note), or
 * `undefined` when gender is not selected (field then shows its blank default).
 */
export function bmi(input: DosingInputs): string | undefined {
  const fieldname2 = num(input.weight);
  const fieldname3 = input.gender;
  const fieldname4 = num(input.height);

  const bmiValue = prec(fieldname2 / pow(fieldname4 / 100, 2), 1);
  const b = toNumber(bmiValue);

  if (fieldname3 === '1') {
    if (b >= 30 && b < 43) {
      return bmiValue + ' - recommend therapeutic drug monitoring with BMI > 30';
    } else if (b >= 43) {
      return bmiValue + ' - recommend therapeutic drug monitoring. LBW fixed with male BMI > 43';
    } else if (b < 30) {
      return bmiValue;
    }
  }
  if (fieldname3 === '2') {
    if (b >= 30 && b < 36) {
      return bmiValue + ' - recommend therapeutic drug monitoring with BMI > 30';
    } else if (b >= 36) {
      return bmiValue + ' - recommend therapeutic drug monitoring. LBW fixed with female BMI > 36';
    } else if (b < 30) {
      return bmiValue;
    }
  }
  return undefined;
}

/**
 * fieldname1 — Lean Body Weight (James equation).
 * Returns the display string (LBW, possibly with a "fixed at max" note), or
 * `undefined` when gender / inputs are missing. Note: the `(weight/height)`
 * term uses height in centimetres — verbatim from the source.
 */
export function leanBodyWeight(input: DosingInputs): string | undefined {
  const fieldname2 = num(input.weight);
  const fieldname3 = input.gender;
  const fieldname4 = num(input.height);

  if (fieldname3 === '1') {
    if (fieldname2 / pow(fieldname4 / 100, 2) < 43) {
      return prec(1.1 * fieldname2 - 128 * pow(fieldname2 / fieldname4, 2), 1);
    } else if (fieldname2 / pow(fieldname4 / 100, 2) >= 43) {
      const x = pow(fieldname4 / 100, 2) * 43;
      return (
        prec(1.1 * x - 128 * pow(x / fieldname4, 2), 1) +
        ' - James equation unreliable at high BMIs. Fixed at max LBW.'
      );
    }
  }
  if (fieldname3 === '2') {
    if (fieldname2 / pow(fieldname4 / 100, 2) < 36) {
      return prec(1.07 * fieldname2 - 148 * pow(fieldname2 / fieldname4, 2), 1);
    } else if (fieldname2 / pow(fieldname4 / 100, 2) >= 36) {
      const x = pow(fieldname4 / 100, 2) * 36;
      return (
        prec(1.07 * x - 148 * pow(x / fieldname4, 2), 1) +
        ' - James equation unreliable at high BMIs. Fixed at max LBW.'
      );
    }
  }
  return undefined;
}

/** The numeric Lean Body Weight value used by the downstream dose equations. */
function lbwNumber(input: DosingInputs): number {
  return toNumber(leanBodyWeight(input));
}

/**
 * fieldname12 — Calculated CrCl (Cockcroft-Gault).
 * Returns the display string, or `undefined` when gender is not selected.
 */
export function creatinineClearance(input: DosingInputs): string | undefined {
  const fieldname2 = num(input.weight);
  const fieldname3 = input.gender;
  const fieldname9 = num(input.creatinine);
  const fieldname10 = num(input.age);

  if (fieldname3 === '1') {
    return prec(((140 - fieldname10) * fieldname2) / (72 * fieldname9), 1);
  }
  if (fieldname3 === '2') {
    return prec(((140 - fieldname10) * fieldname2 * 0.85) / (72 * fieldname9), 1);
  }
  return undefined;
}

/** The numeric CrCl value used by the dose-gating conditions. */
function crclNumber(input: DosingInputs): number {
  return toNumber(creatinineClearance(input));
}

/**
 * fieldname13 — Renal Replacement Correction (instructional text).
 * (The original also resizes the textarea to 4 rows — pure cosmetics, dropped.)
 */
export function renalReplacementCorrection(input: DosingInputs): string {
  if (input.rrt === 'Yes') {
    return 'Dosing is the same mg per dose, but given less frequently according to method of renal replacement. If on intermittent hemodialysis, doses are timed after each HD session. For other forms of renal replacement (e.g. peritoneal dialysis), the doses are timed 3 times a week';
  }
  return 'Follow dose frequency as instructed below';
}

/**
 * fieldname6 — Pyrazinamide Dose Range.
 * Returns the display string, or `null` (field shows "Pending input data").
 */
export function pyrazinamideRange(input: DosingInputs): string | null {
  const fieldname1 = lbwNumber(input);
  const fieldname12 = crclNumber(input);
  const fieldname16 = input.rrt;

  // Impaired-renal / dialysis path
  if ((fieldname12 <= 30 && fieldname12 > 0) || fieldname16 === 'Yes') {
    if (fieldname1 > 0) {
      if (floor((35 * fieldname1) / 250) * 250 + 250 >= 2000) {
        if (floor((25 * fieldname1) / 250) * 250 + 250 >= 2000) {
          return '2000mg(max dose) **minimum dosage at max, range omitted';
        } else {
          return (
            floor((25 * fieldname1) / 250) * 250 +
            250 +
            ' - ' +
            2000 +
            'mg(max dose) with frequency based on renal replacement'
          );
        }
      } else {
        return (
          floor((25 * fieldname1) / 250) * 250 +
          250 +
          ' - ' +
          (floor((35 * fieldname1) / 250) * 250 + 250) +
          'mg with frequency based on renal replacement'
        );
      }
    } else {
      return null;
    }
  }
  // Normal-renal path
  else if (fieldname12 > 30 || (fieldname12 === 0 && fieldname16 === 'No')) {
    if (fieldname1 > 0 && fieldname1 < 40) {
      if (floor((25 * fieldname1) / 250) * 250 + 250 >= 2000) {
        if (floor((20 * fieldname1) / 250) * 250 + 250 >= 2000) {
          return '2000mg(max dose) **minimum dosage at max, range omitted';
        } else {
          return floor((20 * fieldname1) / 250) * 250 + 250 + ' - ' + 2000 + 'mg(max dose)';
        }
      } else {
        return (
          floor((20 * fieldname1) / 250) * 250 +
          250 +
          ' - ' +
          (floor((25 * fieldname1) / 250) * 250 + 250) +
          'mg per day'
        );
      }
    } else if (fieldname1 > 40 && fieldname1 < 90) {
      if (floor((26.8 * fieldname1) / 250) * 250 + 250 >= 2000) {
        if (floor((18.2 * fieldname1) / 250) * 250 + 250 >= 2000) {
          return '2000mg(max dose) **minimum dosage at max, range omitted';
        } else {
          return floor((18.2 * fieldname1) / 250) * 250 + 250 + ' - ' + 2000 + 'mg(max dose)';
        }
      } else {
        return (
          floor((18.2 * fieldname1) / 250) * 250 +
          250 +
          ' - ' +
          (floor((26.8 * fieldname1) / 250) * 250 + 250) +
          'mg per day'
        );
      }
    } else {
      return null;
    }
  }
  return undefined as unknown as null; // neither path matched -> pending
}

/**
 * fieldname14 — Recommended Pyrazinamide Prescription.
 * Returns the display string, or `null` (field shows "Pending input data").
 */
export function pyrazinamidePrescription(input: DosingInputs): string | null {
  const fieldname1 = lbwNumber(input);
  const fieldname12 = crclNumber(input);
  const fieldname16 = input.rrt;

  if ((fieldname12 <= 30 && fieldname12 > 0) || fieldname16 === 'Yes') {
    if (floor((30 * fieldname1) / 250) * 250 + 250 >= 2000) {
      return '2000mg(max dose)** optimal doses for obese patients not established, consider therapeutic drug monitoring';
    } else {
      return (
        floor((30 * fieldname1) / 250) * 250 +
        250 +
        'mg(' +
        prec((floor((30 * fieldname1) / 250) * 250 + 250) / fieldname1, 1) +
        'mg/kg) with frequency based on renal replacement'
      );
    }
  } else if (fieldname12 > 30 || (fieldname12 === 0 && fieldname16 === 'No')) {
    if (fieldname1 > 0 && fieldname1 < 40) {
      return (
        floor((20 * fieldname1) / 250) * 250 +
        250 +
        'mg(' +
        prec((floor((20 * fieldname1) / 250) * 250 + 250) / fieldname1, 1) +
        'mg/kg) per day'
      );
    } else if (fieldname1 > 40 && fieldname1 < 55.5) {
      return '1000mg(' + prec(1000 / fieldname1, 1) + 'mg/kg) per day';
    } else if (fieldname1 >= 55.5 && fieldname1 < 75.5) {
      return '1500mg(' + prec(1500 / fieldname1, 1) + 'mg/kg) per day';
    } else if (fieldname1 >= 75.5 && fieldname1 < 90) {
      return '2000mg(' + prec(2000 / fieldname1, 1) + 'mg/kg) per day';
    } else {
      return null;
    }
  }
  return undefined as unknown as null;
}

/**
 * fieldname7 — Ethambutol Dose Range.
 * Returns the display string, or `null` (field shows "Pending input data").
 */
export function ethambutolRange(input: DosingInputs): string | null {
  const fieldname1 = lbwNumber(input);
  const fieldname12 = crclNumber(input);
  const fieldname16 = input.rrt;

  if ((fieldname12 <= 30 && fieldname12 > 0) || fieldname16 === 'Yes') {
    if (fieldname1 > 0) {
      if (floor((25 * fieldname1) / 200) * 200 + 200 >= 1600) {
        if (floor((15 * fieldname1) / 200) * 200 + 200 >= 1600) {
          return '1600mg(max dose) **minimum dosage at max, range omitted';
        } else {
          return (
            floor((15 * fieldname1) / 200) * 200 +
            200 +
            ' - ' +
            1600 +
            'mg(max dose) with frequency based on renal replacement'
          );
        }
      } else {
        return (
          floor((15 * fieldname1) / 200) * 200 +
          200 +
          ' - ' +
          (floor((25 * fieldname1) / 200) * 200 + 200) +
          'mg with frequency based on renal replacement'
        );
      }
    } else {
      return null;
    }
  } else if (fieldname12 > 30 || (fieldname12 === 0 && fieldname16 === 'No')) {
    if (fieldname1 > 0 && fieldname1 < 40) {
      if (floor((20 * fieldname1) / 200) * 200 + 200 >= 1600) {
        if (floor((15 * fieldname1) / 200) * 200 + 200 >= 1600) {
          return '1600mg(max dose) **minimum dosage at max, range omitted';
        } else {
          return floor((15 * fieldname1) / 200) * 200 + 200 + ' - ' + 1600 + 'mg(max dose)';
        }
      } else {
        return (
          floor((15 * fieldname1) / 200) * 200 +
          200 +
          ' - ' +
          (floor((20 * fieldname1) / 200) * 200 + 200) +
          'mg per day'
        );
      }
    } else if (fieldname1 > 40 && fieldname1 < 90) {
      if (floor((21.4 * fieldname1) / 200) * 200 + 200 >= 1600) {
        if (floor((14.5 * fieldname1) / 200) * 200 + 200 >= 1600) {
          return '1600mg(max dose) **minimum dosage at max, range omitted';
        } else {
          return floor((14.5 * fieldname1) / 200) * 200 + 200 + ' - ' + 1600 + 'mg(max dose)';
        }
      } else {
        return (
          floor((14.5 * fieldname1) / 200) * 200 +
          200 +
          ' - ' +
          (floor((21.4 * fieldname1) / 200) * 200 + 200) +
          'mg per day'
        );
      }
    } else {
      return null;
    }
  }
  return undefined as unknown as null;
}

/**
 * fieldname15 — Recommended Ethambutol Prescription.
 * Returns the display string, or `null` (field shows "Pending input data").
 */
export function ethambutolPrescription(input: DosingInputs): string | null {
  const fieldname1 = lbwNumber(input);
  const fieldname12 = crclNumber(input);
  const fieldname16 = input.rrt;

  if ((fieldname12 <= 30 && fieldname12 > 0) || fieldname16 === 'Yes') {
    if (floor((15 * fieldname1) / 200) * 200 + 200 >= 1600) {
      return '1600mg(max dose)** optimal doses for obese patients not established, consider therapeutic drug monitoring';
    } else {
      return (
        floor((15 * fieldname1) / 200) * 200 +
        200 +
        'mg(' +
        prec((floor((15 * fieldname1) / 200) * 200 + 200) / fieldname1, 1) +
        'mg/kg) with frequency based on renal replacement'
      );
    }
  } else if (fieldname12 > 30 || (fieldname12 === 0 && fieldname16 === 'No')) {
    if (fieldname1 > 0 && fieldname1 < 40) {
      return (
        floor((15 * fieldname1) / 200) * 200 +
        200 +
        'mg(' +
        prec((floor((15 * fieldname1) / 200) * 200 + 200) / fieldname1, 1) +
        'mg/kg) per day'
      );
    } else if (fieldname1 > 40 && fieldname1 < 55.5) {
      return '800mg(' + prec(800 / fieldname1, 1) + 'mg/kg) per day';
    } else if (fieldname1 >= 55.5 && fieldname1 < 75.5) {
      return '1200mg(' + prec(1200 / fieldname1, 1) + 'mg/kg) per day';
    } else if (fieldname1 >= 75.5 && fieldname1 < 90) {
      return '1600mg(' + prec(1600 / fieldname1, 1) + 'mg/kg) per day';
    } else {
      return null;
    }
  }
  return undefined as unknown as null;
}

/* ================================================================== *
 * Top-level aggregation                                               *
 * ================================================================== */

/**
 * Predefined "empty" display text per CFF field. When an equation returns
 * undefined/null the original page shows the field's `predefined` value.
 */
export const PENDING = 'Pending input data';

export interface DosingResult {
  /** fieldname17 */ bmi: string;
  /** fieldname1  */ leanBodyWeight: string;
  /** fieldname12 */ crcl: string;
  /** fieldname13 */ renalCorrection: string;
  /** fieldname6  */ pyrazinamideRange: string;
  /** fieldname14 */ pyrazinamidePrescription: string;
  /** fieldname7  */ ethambutolRange: string;
  /** fieldname15 */ ethambutolPrescription: string;
}

/** Map an equation result to what the field displays. */
function display(value: string | number | null | undefined, pending: string): string {
  if (value === null || value === undefined) return pending;
  return String(value);
}

/**
 * Run the whole calculator and return every field's display string, exactly as
 * the original CFF form would render it.
 */
export function calculate(input: DosingInputs): DosingResult {
  return {
    bmi: display(bmi(input), ''),
    leanBodyWeight: display(leanBodyWeight(input), PENDING),
    crcl: display(creatinineClearance(input), ''),
    renalCorrection: renalReplacementCorrection(input),
    pyrazinamideRange: display(pyrazinamideRange(input), PENDING),
    pyrazinamidePrescription: display(pyrazinamidePrescription(input), PENDING),
    ethambutolRange: display(ethambutolRange(input), PENDING),
    ethambutolPrescription: display(ethambutolPrescription(input), PENDING),
  };
}
