/**
 * Utility functions for data validation
 */

/**
 * Validates if a string is a valid UUID
 * @param {string} uuid - The string to validate
 * @returns {boolean} - True if valid UUID, false otherwise
 */
const validateUUID = (uuid) => {
  if (!uuid) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validates if a value is a valid date
 * @param {*} date - The value to validate
 * @returns {boolean} - True if valid date, false otherwise
 */
const validateDate = (date) => {
  if (!date) return false;
  
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * Validates if a value is a valid email address
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid email, false otherwise
 */
const validateEmail = (email) => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates if a value is a valid phone number
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid phone number, false otherwise
 */
const validatePhone = (phone) => {
  if (!phone) return false;
  
  // Simple validation - can be enhanced based on requirements
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

module.exports = {
  validateUUID,
  validateDate,
  validateEmail,
  validatePhone
};
