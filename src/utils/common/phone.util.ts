// src/common/phone.util.ts
export function stripNonDigits(s: string): string {
    return s.replace(/\D+/g, '');
  }
  
  /**
   * Chuẩn hoá về dạng VN local 10 số nếu có thể.
   * Hỗ trợ input như: "090-123-4567", "+84 90 123 4567", "84 901234567"
   * Trả về: { rawDigits, vnLocal10, isExact10, isPhoneLike }
   */
  export function normalizePhoneInput(input: string) {
    const raw = (input || '').trim();
    const digits = stripNonDigits(raw);
  
    // phone-like nếu >= 6 chữ số (để cho phép partial)
    const isPhoneLike = digits.length >= 6;
  
    // Chuẩn hoá về local 10 số (nếu bắt đầu bằng 84 chuyển thành 0)
    let vnLocal10: string | null = null;
    if (digits.length === 10 && digits.startsWith('0')) {
      vnLocal10 = digits;
    } else if (digits.length === 11 && digits.startsWith('84')) {
      vnLocal10 = '0' + digits.slice(2);
    }
  
    const isExact10 = !!vnLocal10; // đúng 10 số local
    return { rawDigits: digits, vnLocal10, isExact10, isPhoneLike };
  }
  