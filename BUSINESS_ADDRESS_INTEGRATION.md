# Business Address Integration API Documentation

## Overview

This feature automatically integrates business addresses into job creation, ensuring that jobs inherit location data from the associated business when no custom location is provided.

## Key Features

1. **Automatic Address Population**: When creating a job, if no location is specified, the system automatically uses the business address
2. **Custom Location Override**: Jobs can still specify custom locations that override the business address
3. **Consistent Location Data**: Both employees and workers receive complete location information
4. **Address Preview**: Frontend can fetch business address before job creation

## API Endpoints

### 1. Get Business Address (for Job Creation Form)

```http
GET /api/businesses/:businessId/address
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "businessId": "64f8b2a1c234567890abcdef",
    "businessName": "ABC Construction Co.",
    "location": {
      "line1": "123 Main Street",
      "line2": "Suite 100",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
}
```

### 2. Create Job (with Auto-Address)

```http
POST /api/jobs
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (without location - uses business address):**
```json
{
  "title": "Construction Worker Needed",
  "description": "Help with building construction",
  "hourlyRate": 25,
  "business": "64f8b2a1c234567890abcdef",
  "schedule": {
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-22T00:00:00.000Z",
    "startTime": "08:00",
    "endTime": "16:00",
    "workDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  },
  "tags": ["construction", "labor"],
  "urgency": "medium"
}
```

**Request Body (with custom location - overrides business address):**
```json
{
  "title": "Remote Construction Supervisor",
  "description": "Supervise remote construction site",
  "hourlyRate": 35,
  "business": "64f8b2a1c234567890abcdef",
  "location": {
    "address": "456 Construction Site Rd",
    "city": "Brooklyn",
    "state": "NY",
    "postalCode": "11201",
    "latitude": 40.6892,
    "longitude": -73.9442
  },
  "schedule": {
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-22T00:00:00.000Z",
    "startTime": "07:00",
    "endTime": "15:00",
    "workDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  },
  "tags": ["construction", "supervisor"],
  "urgency": "high"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "64f8b2a1c234567890abcdef",
    "title": "Construction Worker Needed",
    "description": "Help with building construction",
    "hourlyRate": 25,
    "business": "64f8b2a1c234567890abcdef",
    "location": {
      "address": "123 Main Street, Suite 100",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "employer": "64f8b2a1c234567890abcdef",
    "status": "active",
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-10T10:00:00.000Z"
  }
}
```

### 3. Get Job (with Location Data)

```http
GET /api/jobs/:jobId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "64f8b2a1c234567890abcdef",
    "title": "Construction Worker Needed",
    "description": "Help with building construction",
    "hourlyRate": 25,
    "location": {
      "address": "123 Main Street, Suite 100",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "business": {
      "_id": "64f8b2a1c234567890abcdef",
      "name": "ABC Construction Co.",
      "location": {
        "line1": "123 Main Street",
        "line2": "Suite 100",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    },
    "employer": "64f8b2a1c234567890abcdef",
    "status": "active",
    "hasApplied": false,
    "premiumRequired": false
  }
}
```

### 4. List Jobs (with Location Data)

```http
GET /api/jobs
Authorization: Bearer <token>
```

**Query Parameters:**
- `lat` (optional): Latitude for location-based search
- `lng` (optional): Longitude for location-based search  
- `radius` (optional): Search radius in kilometers
- `businessId` (optional): Filter by business ID
- `status` (optional): Filter by job status

**Response:**
```json
{
  "status": "success",
  "results": 2,
  "data": [
    {
      "_id": "64f8b2a1c234567890abcdef",
      "title": "Construction Worker Needed",
      "hourlyRate": 25,
      "location": {
        "address": "123 Main Street, Suite 100",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "business": {
        "name": "ABC Construction Co."
      },
      "distance": 2.5,
      "hasApplied": false
    }
  ]
}
```

## Implementation Logic

### Job Creation Flow

1. **Validate Business**: Check if the specified business exists and user has access
2. **Determine Location**:
   - If `location` is provided in request → Use custom location
   - If no `location` provided → Auto-populate from business address
3. **Format Address**: Convert business location schema to job location schema
4. **Create Job**: Save job with populated location data

### Address Mapping

**Business Location Schema:**
```javascript
{
  line1: String,
  line2: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  latitude: Number,
  longitude: Number
}
```

**Job Location Schema:**
```javascript
{
  address: String,      // Combines line1 + line2
  city: String,
  state: String,
  postalCode: String,
  latitude: Number,
  longitude: Number
}
```

## Testing

### Manual Testing

1. **Test Address Auto-Population**:
   ```bash
   # Run the bash test script
   ./test-address-integration.sh
   ```

2. **Test Comprehensive Scenarios**:
   ```bash
   # Run the Node.js test suite
   node test-business-address-integration.js
   
   # Or run quick test
   node test-business-address-integration.js quick
   ```

### Test Scenarios Covered

1. ✅ Job creation without location (auto-populates business address)
2. ✅ Job creation with custom location (overrides business address)
3. ✅ Employee can fetch jobs with location data
4. ✅ Worker can fetch jobs with location data
5. ✅ Location-based job search works correctly
6. ✅ Business address endpoint returns correct data

## Error Handling

- **404**: Business not found
- **400**: Invalid business selection (user doesn't own business)
- **403**: User doesn't have permission to create jobs
- **401**: Invalid or missing authentication token

## Frontend Integration

### Job Creation Form

```javascript
// 1. Fetch business address when business is selected
const fetchBusinessAddress = async (businessId) => {
  const response = await fetch(`/api/businesses/${businessId}/address`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.data.location;
};

// 2. Pre-populate address fields
const businessAddress = await fetchBusinessAddress(selectedBusinessId);
setJobLocationPreview(businessAddress);

// 3. Allow user to override or use business address
const jobData = {
  title: "Job Title",
  description: "Job Description",
  hourlyRate: 25,
  business: selectedBusinessId,
  // location: customLocation || undefined  // Omit for auto-population
};
```

## Benefits

1. **Consistency**: All jobs have location data
2. **User Experience**: Reduces manual data entry
3. **Flexibility**: Allows custom locations when needed
4. **Data Quality**: Ensures accurate address information
5. **Search Capability**: Enables location-based job discovery