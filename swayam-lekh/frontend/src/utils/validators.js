export function validateRegistrationNo(val) {
  if (!val) return false;
  return /^\d{8}$/.test(val);
}

export function validateName(val) {
  if (!val) return false;
  return val.trim().length >= 2;
}

export function validateSecurityCode(val) {
  return val === "12345";
}