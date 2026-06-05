const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique v4 UUID to serve as a request trace ID.
 * @returns {string} The generated trace ID.
 */
function generateTraceId() {
  return uuidv4();
}

module.exports = {
  generateTraceId
};
