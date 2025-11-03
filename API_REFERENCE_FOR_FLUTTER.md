# 📖 API Reference - Job Creation with Business Address Integration

## 🔗 Quick Reference for Flutter Developers

### Base URL
```
http://your-backend-url.com/api
```

### Authentication
```
Headers: {
  "Authorization": "Bearer <jwt-token>",
  "Content-Type": "application/json"
}
```

---

## 📋 Endpoints

### 1. Get Available Businesses
```http
GET /businesses
Authorization: Bearer <employee-token>
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "673abc123def456...",
      "name": "Joe's Restaurant",
      "description": "Family-owned restaurant",
      "type": "Restaurant",
      "phone": "+1-555-0123",
      "email": "contact@joesrestaurant.com",
      "location": {
        "line1": "123 Main Street",
        "line2": "Suite 100",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "United States",
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "isActive": true,
      "stats": {
        "jobsPosted": 5,
        "hires": 3
      }
    }
  ]
}
```

---

### 2. Create Job (Business Address Auto-Integration)
```http
POST /jobs
Authorization: Bearer <employee-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "businessId": "673abc123def456...",     // 🎯 REQUIRED - Backend fetches address
  "title": "Restaurant Server",
  "description": "Looking for experienced server to join our team...",
  "hourlyRate": 15.00,
  "urgency": "medium",                    // "low" | "medium" | "high"
  "tags": ["restaurant", "server", "customer-service"],
  "scheduleStart": "2024-11-05T10:00:00.000Z",
  "scheduleEnd": "2024-11-05T18:00:00.000Z",
  "recurrence": "weekly",                 // "once" | "weekly" | "monthly" | "custom"
  "workDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "verificationRequired": false,
  "hasOvertime": true,
  "overtimeRate": 22.50,
  "customAddress": "Custom address override (optional)"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "673def456abc789...",
    "title": "Restaurant Server",
    "description": "Looking for experienced server...",
    "hourlyRate": 15.00,
    "urgency": "medium",
    "tags": ["restaurant", "server", "customer-service"],
    "status": "active",
    "scheduleStart": "2024-11-05T10:00:00.000Z",
    "scheduleEnd": "2024-11-05T18:00:00.000Z",
    "recurrence": "weekly",
    "workDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "verificationRequired": false,
    "premiumRequired": false,
    "applicantsCount": 0,
    
    // 🎯 Business Address Fields (Auto-populated by backend)
    "businessId": "673abc123def456...",
    "businessName": "Joe's Restaurant",           // ← Auto-filled
    "businessAddress": "123 Main St, New York, NY 10001",  // ← Auto-filled
    "locationSummary": "New York, NY",            // ← Auto-filled
    "businessLogoUrl": "https://...",             // ← Auto-filled
    "businessLogoSquareUrl": "https://...",       // ← Auto-filled
    "businessLogoOriginalUrl": "https://...",     // ← Auto-filled
    
    // 🗺️ Enhanced Location Object
    "location": {
      "line1": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "United States",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "formattedAddress": "123 Main St, New York, NY 10001",
      "shortAddress": "New York, NY",
      "fullAddress": "123 Main St, New York, NY 10001",
      "label": "Joe's Restaurant"
    }
  }
}
```

---

### 3. Get Jobs (Employee)
```http
GET /jobs?page=1&limit=20&status=active
Authorization: Bearer <employee-token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (`active`, `closed`, `filled`, `draft`)
- `urgency` (optional): Filter by urgency (`low`, `medium`, `high`)
- `businessId` (optional): Filter by specific business

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "673def456abc789...",
      "title": "Restaurant Server",
      "businessName": "Joe's Restaurant",
      "businessAddress": "123 Main St, New York, NY 10001",
      "locationSummary": "New York, NY",
      "status": "active",
      "hourlyRate": 15.00,
      "applicantsCount": 3,
      "location": { /* location object */ }
      // ... other job fields
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### 4. Get Jobs (Worker)
```http
GET /jobs?page=1&limit=20
Authorization: Bearer <worker-token>
```

**Response (Enhanced for Workers):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "673def456abc789...",
      "title": "Restaurant Server",
      "businessName": "Joe's Restaurant",
      "businessAddress": "123 Main St, New York, NY 10001",
      "locationSummary": "New York, NY",
      "status": "active",
      "hourlyRate": 15.00,
      "urgency": "medium",
      
      // 👷 Worker-specific fields
      "hasApplied": false,                    // ← Has this worker applied?
      "distanceMiles": 2.5,                   // ← Distance from worker location
      "premiumRequired": false,               // ← Premium needed to apply?
      
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "formattedAddress": "123 Main St, New York, NY 10001",
        "shortAddress": "New York, NY",
        // ... other location fields
      }
      // ... other job fields
    }
  ]
}
```

---

### 5. Get Specific Job
```http
GET /jobs/:jobId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    // Same structure as create job response
    // Includes all business address fields
    // Includes worker-specific fields if worker token
  }
}
```

---

## ❌ Error Responses

### Validation Error (400)
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "businessId",
      "message": "Business ID is required"
    },
    {
      "field": "hourlyRate",
      "message": "Enter a valid hourly rate"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "status": "fail",
  "message": "Authentication required. Please log in."
}
```

### Authorization Error (403)
```json
{
  "status": "fail",
  "message": "You can only create jobs for your own businesses"
}
```

### Not Found Error (404)
```json
{
  "status": "fail",
  "message": "Business not found"
}
```

### Server Error (500)
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

## 🎯 Flutter Implementation Examples

### Create Job Request
```dart
final request = {
  'businessId': selectedBusiness.id,  // Backend fetches address automatically
  'title': titleController.text,
  'description': descriptionController.text,
  'hourlyRate': double.parse(rateController.text),
  'urgency': selectedUrgency,
  'scheduleStart': startDate.toIso8601String(),
  'scheduleEnd': endDate.toIso8601String(),
};

final response = await dio.post('/api/jobs', data: request);
final job = JobPosting.fromJson(response.data['data']);

// Address fields are automatically populated:
print(job.businessAddress);  // "123 Main St, New York, NY 10001"
print(job.businessName);     // "Joe's Restaurant"
print(job.locationSummary);  // "New York, NY"
```

### Display Job Address
```dart
Widget buildJobCard(JobPosting job) {
  return Card(
    child: Column(
      children: [
        Text(job.title),
        Text(job.businessName),                    // Auto-filled business name
        Row(
          children: [
            Icon(Icons.location_on),
            Text(job.businessAddress),             // Auto-filled address
          ],
        ),
        if (job.location?.latitude != null)
          // Show map with coordinates
          MapWidget(
            lat: job.location!.latitude!,
            lng: job.location!.longitude!,
            label: job.location!.label,            // Business name for marker
          ),
      ],
    ),
  );
}
```

### Worker-Specific UI
```dart
Widget buildWorkerJobCard(JobPosting job) {
  return Card(
    child: Column(
      children: [
        Text(job.title),
        Text('${job.businessName} • ${job.locationSummary}'),
        if (job.distanceMiles != null)
          Text('${job.distanceMiles!.toStringAsFixed(1)} miles away'),
        ElevatedButton(
          onPressed: job.hasApplied ? null : () => applyToJob(job),
          child: Text(job.hasApplied ? 'Applied ✓' : 'Apply Now'),
        ),
      ],
    ),
  );
}
```

---

## ✅ Quick Checklist for Flutter Integration

### Job Creation:
- [ ] Fetch businesses with `GET /businesses`
- [ ] Let user select business from dropdown
- [ ] Send job creation request with `businessId`
- [ ] Backend automatically fetches and integrates business address
- [ ] Display success message with job details

### Job Display:
- [ ] Use `job.businessAddress` for location display
- [ ] Use `job.businessName` for business name
- [ ] Use `job.locationSummary` for short address format
- [ ] Use `job.location.latitude/longitude` for maps
- [ ] Show `job.distanceMiles` for workers
- [ ] Handle `job.hasApplied` state for workers

### Error Handling:
- [ ] Handle 401 errors → redirect to login
- [ ] Handle 400 errors → show validation messages
- [ ] Handle 403 errors → show permission denied
- [ ] Handle 404 errors → show not found message
- [ ] Handle 500 errors → show generic error with retry

## 🎉 You're Ready!

Your Flutter app now has everything needed to:
1. ✅ Create jobs with automatic business address integration
2. ✅ Display jobs with proper address information
3. ✅ Handle all worker and employee scenarios
4. ✅ Manage errors gracefully

**The backend handles all address complexity - your Flutter app just uses the provided fields!** 🚀