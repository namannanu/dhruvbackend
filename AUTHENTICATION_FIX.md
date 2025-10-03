# Authentication Issue Fix - UserId Generation

## Problem Identified
The Flutter app was encountering a 500 error during user registration and login due to:
```
User validation failed: userId: Path `userId` is required.
```

## Root Cause
The User model had `userId` marked as `required: true` but the field wasn't being generated before the validation ran during user creation.

## Fix Applied

### 1. Updated User Model (`src/modules/users/user.model.js`)
- **Removed** `required: true` from userId field
- **Added** `default` function to automatically generate userId
- **Updated** pre-save middleware to use the same generation logic

```javascript
userId: {
  type: String,
  unique: true,
  index: true,
  default: function() {
    // Generate 8-character alphanumeric userId
    return Math.random().toString(36).substring(2, 8).toUpperCase() + 
           Math.random().toString(36).substring(2, 4).toUpperCase();
  }
}
```

### 2. Enhanced Authentication Routes
- **Added** `/api/auth/register` as alternative to `/api/auth/signup`
- Both endpoints now work for user registration

### 3. Updated Postman Collection
- **Fixed** registration endpoint URL
- **Improved** response handling for auth tokens
- **Added** proper test validation

## Flutter Integration Notes

### Correct API Endpoints
```dart
// Both endpoints work for registration
POST /api/auth/signup
POST /api/auth/register

// Login endpoint
POST /api/auth/login
```

### Request Format for Registration
```json
{
  "name": "John Doe",           // or use firstName/lastName
  "email": "user@example.com",
  "password": "securepassword",
  "userType": "employer",       // or "worker"
  "phone": "+1234567890"        // optional
}
```

### Request Format for Login
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Expected Response Format
```json
{
  "status": "success",
  "token": "jwt_token_here",
  "data": {
    "user": {
      "userId": "A1B2C3D4",     // 8-character generated ID
      "email": "user@example.com",
      "userType": "employer",
      "firstName": "John",
      "lastName": "Doe"
    },
    "employerProfile": { ... },  // if userType is "employer"
    "workerProfile": { ... },    // if userType is "worker"
    "tokenExpiry": 1759532400000
  }
}
```

### Important Flutter Implementation Notes

1. **No Authorization Header for Auth Endpoints**
   ```dart
   // ❌ Wrong - Don't send auth header to login/signup
   headers: {
     'Authorization': 'Bearer $token', // Remove this for auth endpoints
     'Content-Type': 'application/json',
   }
   
   // ✅ Correct - Only content-type for auth endpoints
   headers: {
     'Content-Type': 'application/json',
   }
   ```

2. **Store Token from Response**
   ```dart
   if (response.statusCode == 200 || response.statusCode == 201) {
     final data = json.decode(response.body);
     final token = data['token'];
     final userId = data['data']['user']['userId'];
     
     // Store for future authenticated requests
     await SharedPreferences.getInstance().then((prefs) {
       prefs.setString('auth_token', token);
       prefs.setString('user_id', userId);
     });
   }
   ```

3. **Use Stored Token for Other Endpoints**
   ```dart
   // For all other API calls (jobs, attendance, etc.)
   headers: {
     'Authorization': 'Bearer $storedToken',
     'Content-Type': 'application/json',
   }
   ```

## Testing

### Using Postman
1. Import the updated `WorkConnect-Complete-API-Collection.json`
2. Run the "Register User" request
3. Verify the response includes a valid 8-character userId
4. Test login with the created user

### Manual Testing
```bash
# Test Registration
curl -X POST https://dhruvbackend.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpassword",
    "userType": "employer"
  }'

# Test Login
curl -X POST https://dhruvbackend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword"
  }'
```

## What Was Fixed
- ✅ UserId generation now works automatically
- ✅ Registration endpoint returns proper response format
- ✅ Login endpoint works correctly
- ✅ Both `/signup` and `/register` endpoints available
- ✅ Postman collection updated with correct endpoints
- ✅ Documentation updated with Flutter integration details

The Flutter app should now be able to successfully register and login users without the userId validation error.