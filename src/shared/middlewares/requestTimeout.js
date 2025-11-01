const requestTimeout = (timeoutMs = 25000) => {
  return (req, res, next) => {
    // Set request timeout
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`Request timeout after ${timeoutMs}ms for ${req.method} ${req.path}`);
        res.status(408).json({
          status: 'error',
          message: 'Request timeout',
          code: 'REQUEST_TIMEOUT'
        });
      }
    }, timeoutMs);

    // Clear timeout if response is sent
    const originalEnd = res.end;
    res.end = function(...args) {
      clearTimeout(timeout);
      originalEnd.apply(this, args);
    };

    next();
  };
};

module.exports = requestTimeout;