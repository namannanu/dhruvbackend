Server-side image optimization with sharp

What changed
- Added `sharp` dependency to `package.json` to optimize uploaded business logos.
- `uploadBusinessLogo` in `src/modules/businesses/business.controller.js` now:
  - Produces an optimized original (webp, max width 1024) and a square variant (256x256, webp).
  - Stores buffers, mimeType, size, and data URL for both variants.
  - Returns the square variant as the primary logo URL.

Why
- Reduces payload sizes when serving logos to clients.
- Provides consistent square avatars for lists and cards.

Notes for deployment (Vercel)
- `sharp` includes native binaries. Vercel supports `sharp` out of the box, but ensure you install dependencies before deploying.
- If building locally for deployment, run:

```bash
cd "dhruv backend"
npm install --production
```

- If you see runtime errors related to missing native modules, rebuild with the correct Node.js version that matches your Vercel runtime.

Testing locally
- Start the server locally and use a tool like `curl` or Postman to upload an image to the route:
  POST /api/businesses/:businessId/logo (multipart form, field name `logo`)

Example (curl):

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "logo=@./sample.png" \
  https://localhost:3000/api/businesses/<BUSINESS_ID>/logo
```

Follow-up ideas
- Store images in an object storage (S3) and save only URLs in the DB for lower DB size and bandwidth.
- Generate multiple sizes (small, medium, large) and support progressive loading on the client.
- Cache frequently-requested images via CDN.
