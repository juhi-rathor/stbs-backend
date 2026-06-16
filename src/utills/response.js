// utils/response.js
function send(res, status, success, message, data = null) {
  return res.status(status).json({
    status,
    success,
    message,
    data,
  });
}

// ✅ success helpers
function ok(res, data = null, message = "OK") {
  return send(res, 200, true, message, data);
}

function created(res, data = null, message = "Created") {
  return send(res, 201, true, message, data);
}

function noContent(res) {
  return res.status(204).end(); // 204 must not include body
}

// ❌ error helpers (all will use same structure)
function fail(res, status, message = "Error", data = null) {
  return send(res, status, false, message, data);
}

function responseMiddleware(req, res, next) {
  // success
  res.ok = (data = null, message = "OK") => ok(res, data, message);
  res.created = (data = null, message = "Created") =>
    created(res, data, message);
  res.noContent = () => noContent(res);

  // client errors
  res.badRequest = (message = "Bad request", data = null) =>
    fail(res, 400, message, data);
  res.unauthorized = (message = "Unauthorized", data = null) =>
    fail(res, 401, message, data);
  res.forbidden = (message = "Forbidden", data = null) =>
    fail(res, 403, message, data);
  res.notFound = (message = "Not found", data = null) =>
    fail(res, 404, message, data);
  res.conflict = (message = "Conflict", data = null) =>
    fail(res, 409, message, data);
  res.tooMany = (message = "Too many requests", data = null) =>
    fail(res, 429, message, data);

  // server errors
  res.serverError = (message = "Server error", data = null) =>
    fail(res, 500, message, data);

  next();
}

function catchAsync(fn) {
  return function handler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  responseMiddleware,
  catchAsync,
};
