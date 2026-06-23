/** Employer sector values used in loan requests and bank sector interest rates. */
export const EMPLOYER_SECTORS = [
  { value: "خاص", label: "قطاع خاص" },
  { value: "حكومي مدني", label: "حكومي مدني" },
  { value: "حكومي عسكرى", label: "حكومي عسكرى" },
  { value: "متقاعد", label: "متقاعد" },
];

export const EMPLOYER_SECTOR_VALUES = EMPLOYER_SECTORS.map((s) => s.value);
