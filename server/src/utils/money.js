// PHP amounts are numeric(10,2) strings; whole centavos only.
export const isPesoAmount = (value) =>
   /^\d{1,8}(\.\d{1,2})?$/.test(String(value));

export const toCentavos = (amount) => Math.round(Number(amount) * 100);

export const fromCentavos = (centavos) => (centavos / 100).toFixed(2);
