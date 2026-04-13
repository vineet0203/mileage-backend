/**
 * Globally overrides console methods to automatically include a timestamp.
 * This ensures every log statement has a consistent timestamp without 
 * requiring manual imports or logger calls.
 */

const getTimestamp = () => {
  const [date, time] = new Date().toISOString().replace('Z', '').split('T');
  const formattedDate = date.split('-').reverse().join('-');
  return `${formattedDate} ${time}`;
};

const addTimestamp = (originalFn, level) => (...args) => {
  const timestamp = getTimestamp();
  
  // Add some color to the level for better readability
  const colors = {
    LOG: '\x1b[32m',   // Green
    INFO: '\x1b[34m',  // Blue
    WARN: '\x1b[33m',  // Yellow
    ERROR: '\x1b[31m', // Red
    RESET: '\x1b[0m'
  };

  const prefix = `[${timestamp}] ${colors[level]}${level}${colors.RESET}:`;
  originalFn(prefix, ...args);
};

console.log = addTimestamp(console.log, 'LOG');
console.info = addTimestamp(console.info, 'INFO');
console.warn = addTimestamp(console.warn, 'WARN');
console.error = addTimestamp(console.error, 'ERROR');

export default {}; // Side-effect only module
