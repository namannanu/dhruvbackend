/**
 * Enhanced CORS middleware for Vercel serverless deployment
 * Handles preflight requests and cross-origin issues
 */

const setupCors = (req, res, next) => {
  // Get origin from request
  const origin = req.headers.origin;
  
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allow all origins
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': [
      'Accept',
      'Accept-Version',
      'Authorization',
      'Content-Length',
      'Content-MD5',
      'Content-Type',
      'Date',
      'Origin',
      'X-Api-Version',
      'X-CSRF-Token',
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'Cache-Control',
      'Pragma'
    ].join(', '),
    'Access-Control-Expose-Headers': [
      'Authorization',
      'Content-Length',
      'Content-Type',
      'Date',
      'ETag',
      'X-Auth-Token'
    ].join(', '),
    'Access-Control-Max-Age': '86400', // 24 hours
    'Vary': 'Origin'
  };

  // Apply headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};

module.exports = setupCors;