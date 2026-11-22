// PHP amounts are numeric(10,2) strings; whole centavos only.
export const isPesoAmount = (value) =>
   /^\d{1,8}(\.\d{1,2})?$/.test(String(value));
