# Environment Variables for Vercel Deployment

## Required Environment Variables

Add these environment variables to your Vercel project:

### Database
- `MONGO_URI` - Your MongoDB connection string

### JWT Authentication
- `JWT_SECRET` - Secret key for JWT token generation
- `JWT_EXPIRES_IN` - Token expiration time (e.g., "7d")

### Other
- `NODE_ENV` - Set to "production"
- `PORT` - Set to "3000" (though Vercel manages this)
- `CORS_ORIGINS` - Comma separated origin allow-list

## How to Add Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add each variable with its value
5. Make sure to add them for Production, Preview, and Development environments

## Example .env.local for local testing
```
MONGO_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173
```

Note: Never commit actual environment values to your repository!
