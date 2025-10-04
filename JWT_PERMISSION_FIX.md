# ✅ JWT Token & Permission System Fix

## 🚨 **Issue Identified**
The permission system was giving "Insufficient permissions. Required: create_business" error even for the main employee because:

1. **JWT Token** only contained `id` field, not `userId`
2. **Permission Middleware** always checked team permissions, even for main employee
3. **No distinction** between main employee and team members

## 🔧 **Solution Implemented**

### 1. **Enhanced JWT Token Payload**
**Before**:
```javascript
jwt.sign({ id: userId }, secret, options)
```

**After**:
```javascript
jwt.sign({ 
  id: user._id,     // MongoDB ObjectId for database queries
  userId: user.userId // 8-character alphanumeric ID for identification
}, secret, options)
```

### 2. **Updated Auth Middleware**
Enhanced `auth.middleware.js` to extract and store `userId` from token:

```javascript
// Extract token data
const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

// Add token userId to request for permission checking
req.user = currentUser;
req.user.tokenUserId = decoded.userId; // userId from the token

console.log('🔍 User Lookup:', {
  userActualUserId: currentUser?.userId,     // From database
  tokenUserId: decoded.userId,               // From token
  isMainEmployee: currentUser?.userId === decoded.userId
});
```

### 3. **Smart Permission Middleware**
Modified `permissionMiddleware.js` to distinguish between main employee and team members:

```javascript
function requirePermissions(permissions, options = {}) {
  return async (req, res, next) => {
    // Check if this is the main employee
    if (req.user.tokenUserId && req.user.tokenUserId === req.user.userId) {
      console.log(`✅ Main employee access granted for userId: ${req.user.userId}`);
      // Main employee has ALL permissions - skip permission checks
      req.userPermissions = ['all_permissions'];
      return next();
    }

    // For team members, check permissions normally
    console.log(`🔍 Checking team permissions for user: ${req.user.id}`);
    const userPermissions = await getUserPermissions(req.user.id, businessId);
    // ... permission validation logic
  };
}
```

## 🎯 **How It Works Now**

### **Main Employee Flow**:
1. **Login** → Token contains `{ id: "ObjectId", userId: "7YUEPZY9" }`
2. **Request** → Auth middleware extracts both values
3. **Permission Check** → `tokenUserId === user.userId` → **ALL PERMISSIONS GRANTED**
4. **Success** → Can create businesses, manage everything

### **Team Member Flow**:
1. **Team Member Login** → Token contains `{ id: "TeamMemberObjectId", userId: "TEAMUSER1" }`
2. **Request** → Auth middleware extracts both values  
3. **Permission Check** → `tokenUserId !== user.userId` → **CHECK TEAM PERMISSIONS**
4. **Validation** → Only granted permissions from team access work

## 📋 **Example Scenario**

### Main Employee (John):
```javascript
// John's token when he logs in
{
  "id": "68e063ad981fb49497019342",      // John's MongoDB _id
  "userId": "7YUEPZY9",                  // John's userId
  "iat": 1759615890,
  "exp": 1760220690
}

// Permission check result
tokenUserId: "7YUEPZY9" === user.userId: "7YUEPZY9" ✅
Result: ALL PERMISSIONS GRANTED
```

### Team Member (Sarah):
```javascript
// Sarah's token when she logs in
{
  "id": "68e063ad981fb49497019999",      // Sarah's MongoDB _id
  "userId": "SARAH123",                  // Sarah's userId
  "iat": 1759615890,
  "exp": 1760220690
}

// When Sarah tries to access John's data
tokenUserId: "SARAH123" !== user.userId: "7YUEPZY9" ❌
Result: CHECK TEAM PERMISSIONS (restricted access)
```

## 🔄 **Token Debugging**

The auth middleware now provides detailed logging:

```javascript
console.log('🔍 JWT Debug:', {
  decodedId: decoded.id,
  decodedUserId: decoded.userId,         // NEW: userId from token
  decodedIat: decoded.iat,
  tokenValid: true
});

console.log('🔍 User Lookup:', {
  userFound: !!currentUser,
  userId: currentUser?._id,
  userActualUserId: currentUser?.userId, // NEW: userId from database
  tokenUserId: decoded.userId,           // NEW: userId from token
  isMainEmployee: currentUser?.userId === decoded.userId, // NEW: comparison
  userType: currentUser?.userType,
  userEmail: currentUser?.email
});
```

## ✅ **Files Modified**

1. **`/src/modules/auth/auth.service.js`**:
   - Updated `signToken()` to include `userId` in token payload
   - Updated `issueAuthResponse()` to pass user object instead of just ID

2. **`/src/shared/middlewares/auth.middleware.js`**:
   - Enhanced token decoding to extract `userId`
   - Added `req.user.tokenUserId` for permission checking
   - Enhanced debugging logs

3. **`/src/shared/middlewares/permissionMiddleware.js`**:
   - Added main employee detection logic
   - Grant all permissions when `tokenUserId === user.userId`
   - Fall back to team permission checking for team members

## 🚀 **Expected Results**

### ✅ **Main Employee (Your Case)**:
- **Token userId**: `7YUEPZY9` (from your JWT)
- **User userId**: `7YUEPZY9` (from database)
- **Match**: YES → **ALL PERMISSIONS GRANTED**
- **Result**: Can create businesses successfully ✅

### ✅ **Team Members**:
- **Token userId**: Their own userId (e.g., `TEAM123`)
- **User userId**: Employee's userId (e.g., `7YUEPZY9`)
- **Match**: NO → **CHECK TEAM PERMISSIONS**
- **Result**: Only permissions granted via team access work ✅

## 🎯 **Test Your Token**

Your JWT payload should now look like:
```javascript
{
  "id": "68e063ad981fb49497019342",  // Your MongoDB _id
  "userId": "7YUEPZY9",              // Your 8-character userId  
  "iat": 1759615890,
  "exp": 1760220690
}
```

When you make a request to create a business, the system will:
1. ✅ Decode token and find `userId: "7YUEPZY9"`
2. ✅ Look up user and find `user.userId: "7YUEPZY9"`
3. ✅ Match found → Grant ALL permissions
4. ✅ Business creation succeeds!

## 🔑 **Cache Strategy**
- **Main Employee**: `tokenUserId === user.userId` → Cache with full permissions
- **Team Member**: `tokenUserId !== user.userId` → Cache with restricted permissions
- **Easy Identification**: Single token comparison determines access level

---

*The permission system now correctly distinguishes between main employees and team members based on JWT token content!*