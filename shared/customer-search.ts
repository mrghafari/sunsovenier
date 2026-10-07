/** Accept the same business customer number in Latin, Persian or Arabic digits. */
export function normalizeCustomerSearch(value: string): string {
  return value.trim().replace(/[۰-۹٠-٩]/g, digit =>
    String(digit.charCodeAt(0) - (digit >= "۰" && digit <= "۹" ? 0x06f0 : 0x0660)));
}
