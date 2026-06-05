const { ValidationError } = require('../utils/errors');

/**
 * Reusable Zod validation middleware factory.
 * Parses req.body with schema.safeParse. If it fails, throws a ValidationError 
 * with a message listing all field errors formatted as "field: message". 
 * If it passes, sets req.body to the parsed data and calls next().
 * 
 * @param {import('zod').Schema} schema - Zod schema to validate against.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errorMessages = result.error.errors.map(err => {
      const fieldPath = err.path.join('.');
      return `${fieldPath}: ${err.message}`;
    });
    throw new ValidationError(errorMessages.join(', '));
  }
  req.body = result.data;
  next();
};

module.exports = {
  validate
};
