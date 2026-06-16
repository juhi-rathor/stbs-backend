/**
 * Utility to wrap async controller functions and forward errors.
 * @param {Function} fn
 * @returns {Function}
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
