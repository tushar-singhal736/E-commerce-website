/**
 * User Data Validation & Normalization Utilities
 * Ensures consistent email/user data handling across the app
 */

export const normalizeEmail = (email) => {
  if (!email) return '';
  return String(email).trim().toLowerCase();
};

export const isValidEmail = (email) => {
  const normalized = normalizeEmail(email);
  // Simple email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized);
};

export const isValidPassword = (password) => {
  // Minimum 6 characters
  return String(password || '').length >= 6;
};

export const isValidPhone = (phone) => {
  // Basic phone validation - at least 10 digits
  const digitsOnly = String(phone || '').replace(/\D/g, '');
  return digitsOnly.length >= 10;
};

export const isValidFullName = (fullName) => {
  return String(fullName || '').trim().length >= 2;
};

export const sanitizeUserInput = (input) => {
  // Remove leading/trailing whitespace and basic HTML encoding
  if (!input) return '';
  return String(input)
    .trim()
    .replace(/[<>]/g, ''); // Remove angle brackets to prevent basic XSS
};

export const validateSignupData = (data) => {
  const errors = {};

  if (!isValidFullName(data.fullName)) {
    errors.fullName = 'Full name must be at least 2 characters';
  }

  if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!isValidPassword(data.password)) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.phone = 'Phone number must have at least 10 digits';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateLoginData = (email, password) => {
  const errors = {};

  if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!isValidPassword(password)) {
    errors.password = 'Password must be at least 6 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const sanitizeUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    fullName: String(user.fullName || '').trim(),
    email: normalizeEmail(user.email),
    phone: String(user.phone || '').trim(),
    dateOfBirth: user.dateOfBirth || '',
    role: user.role || 'customer',
  };
};
