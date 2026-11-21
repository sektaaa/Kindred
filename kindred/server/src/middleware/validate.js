const AppError = require('../utils/AppError');

// validate(schema, 'body' | 'params' | 'query') -> replaces req[source] with the parsed, typed value.
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new AppError('Validation failed', 400, details));
  }
  req[source] = result.data;
  next();
};

module.exports = validate;
