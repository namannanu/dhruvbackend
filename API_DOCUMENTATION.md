# WorkConnect Backend API Documentation

## Overview
This documentation covers all the recent changes and new features added to the WorkConnect backend, including the userId system, Google Places API integration, and comprehensive team management system.

## Table of Contents
1. [UserId System](#userid-system)
2. [Google Places API Integration](#google-places-api-integration)
3. [Team Management System](#team-management-system)
4. [Enhanced Location Features](#enhanced-location-features)
5. [API Endpoints](#api-endpoints)
6. [Flutter Integration Guide](#flutter-integration-guide)
7. [Data Models](#data-models)

---

## UserId System

### Overview
A randomly generated 8-character alphanumeric userId system that provides universal access to user data across all modules.

### Key Features
- **Random Generation**: 8-character alphanumeric IDs (e.g., "A1B2C3D4")
- **Universal Access**: Single userId to access jobs, applications, attendance, payments, shifts
- **Team Management**: Share userId with team members for delegated access
- **Data Aggregation**: Consolidated data access across all user activities

### Implementation
```javascript
// Auto-generated on user creation
userId: {
  type: String,
  unique: true,
  default: function() {
    return Math.random().toString(36).substring(2, 8).toUpperCase() + 
           Math.random().toString(36).substring(2, 4).toUpperCase();
  }
}
```

---

## Google Places API Integration

### Overview
Complete integration with Google Places API for accurate location tracking, geofencing, and attendance validation.

### Key Features
- **GPS Coordinates**: Precise latitude/longitude tracking
- **Geofencing**: Location-based attendance validation
- **Address Validation**: Google Places API integration
- **Distance Calculation**: Haversine formula for proximity checks

### Location Schema
```javascript
location: {
  address: { type: String, required: true },
  latitude: { 
    type: Number, 
    required: true,
    min: -90, 
    max: 90 
  },
  longitude: { 
    type: Number, 
    required: true,
    min: -180, 
    max: 180 
  },
  googlePlaceId: { type: String },
  geofenceRadius: { 
    type: Number, 
    default: 100,
    min: 10,
    max: 1000
  }
}
```

### Geofencing Methods
```javascript
// Check if location is within geofence
isWithinGeofence(userLat, userLng) {
  const distance = calculateDistance(
    this.location.latitude, 
    this.location.longitude,
    userLat, 
    userLng
  );
  return distance <= (this.location.geofenceRadius || 100);
}
```

---

## Team Management System

### Overview
Comprehensive role-based access control system allowing users to delegate access to their userId data.

### Roles and Permissions

#### Admin Role
- Full access to all data and operations
- Can create, edit, delete all resources
- Can manage team members and permissions
- Can view all reports and analytics

#### Manager Role
- Can create and edit jobs
- Can manage worker applications
- Can view and manage attendance
- Can hire workers and assign shifts

#### Staff Role
- Can view jobs and applications
- Can manage attendance for assigned workers
- Limited editing capabilities
- Cannot create new jobs

#### Viewer Role
- Read-only access to assigned data
- Can view jobs, applications, attendance
- Cannot make any modifications
- Limited to specific data sets

### Permission Structure
```javascript
permissions: {
  // Job Management
  canCreateJobs: { type: Boolean, default: false },
  canEditJobs: { type: Boolean, default: false },
  canDeleteJobs: { type: Boolean, default: false },
  canViewJobs: { type: Boolean, default: false },
  
  // Worker Management
  canHireWorkers: { type: Boolean, default: false },
  canViewApplications: { type: Boolean, default: false },
  canManageApplications: { type: Boolean, default: false },
  
  // Attendance Management
  canCreateAttendance: { type: Boolean, default: false },
  canViewAttendance: { type: Boolean, default: false },
  canEditAttendance: { type: Boolean, default: false },
  
  // Employment Management
  canManageEmployment: { type: Boolean, default: false },
  canViewEmployment: { type: Boolean, default: false },
  
  // Financial Management
  canViewPayments: { type: Boolean, default: false },
  canProcessPayments: { type: Boolean, default: false },
  
  // Team Management
  canManageTeam: { type: Boolean, default: false },
  canViewTeamReports: { type: Boolean, default: false }
}
```

---

## Enhanced Location Features

### Location Validation
All location-based operations now include:
- GPS coordinate validation
- Geofence boundary checking
- Distance calculation
- Location accuracy verification

### Attendance Location Tracking
```javascript
attendanceLocation: {
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number },
  timestamp: { type: Date, default: Date.now },
  isWithinGeofence: { type: Boolean, required: true },
  distanceFromJob: { type: Number } // in meters
}
```

---

## API Endpoints

### User Data Access
```
GET /api/users/data/:userId
```
**Description**: Get comprehensive user data by userId
**Authentication**: Required or Team Access
**Response**: All user-related data (jobs, applications, attendance, etc.)

### Team Management Endpoints

#### Grant Team Access
```
POST /api/team/grant-access
```
**Body**:
```json
{
  "targetUserId": "MANAGER1",
  "managedUserId": "A1B2C3D4",
  "role": "manager",
  "permissions": {
    "canCreateJobs": true,
    "canEditJobs": true,
    "canViewJobs": true,
    "canHireWorkers": true
  },
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "reason": "Temporary manager access"
}
```

#### List Team Members
```
GET /api/team/my-team
```
**Description**: List all users who have access to your data

#### Check Team Access
```
GET /api/team/check-access/:userId?permission=canCreateJobs
```
**Description**: Check if you have specific access to a userId

#### Update Team Permissions
```
PATCH /api/team/access/:accessId
```
**Body**:
```json
{
  "role": "staff",
  "permissions": {
    "canViewJobs": true,
    "canCreateJobs": false
  }
}
```

#### Revoke Team Access
```
DELETE /api/team/access/:accessId
```

### Enhanced Job Management

#### Create Job with Location
```
POST /api/jobs
```
**Body**:
```json
{
  "title": "Construction Worker",
  "description": "Building construction work",
  "location": {
    "address": "123 Main St, City, State",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "googlePlaceId": "ChIJOwg_06VPwokRYv534QaPC8g",
    "geofenceRadius": 150
  },
  "salary": 25,
  "requirements": ["Physical fitness", "Experience"],
  "workingHours": {
    "start": "08:00",
    "end": "17:00"
  }
}
```

### Attendance with Location Validation
```
POST /api/attendance
```
**Body**:
```json
{
  "jobId": "job_id_here",
  "type": "check-in",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 5
  },
  "notes": "Started morning shift"
}
```

---

## Flutter Integration Guide

### 1. API Service Setup

```dart
class ApiService {
  static const String baseUrl = 'https://your-api-domain.com/api';
  
  // Headers with authentication
  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${UserPreferences.getToken()}',
  };
}
```

### 2. User Data Model

```dart
class UserData {
  final String userId;
  final List<Job> jobs;
  final List<Application> applications;
  final List<Attendance> attendanceRecords;
  final List<Employment> employments;
  final List<Payment> payments;
  
  UserData({
    required this.userId,
    required this.jobs,
    required this.applications,
    required this.attendanceRecords,
    required this.employments,
    required this.payments,
  });
  
  factory UserData.fromJson(Map<String, dynamic> json) {
    return UserData(
      userId: json['userId'],
      jobs: (json['jobs'] as List).map((e) => Job.fromJson(e)).toList(),
      applications: (json['applications'] as List).map((e) => Application.fromJson(e)).toList(),
      attendanceRecords: (json['attendance'] as List).map((e) => Attendance.fromJson(e)).toList(),
      employments: (json['employments'] as List).map((e) => Employment.fromJson(e)).toList(),
      payments: (json['payments'] as List).map((e) => Payment.fromJson(e)).toList(),
    );
  }
}
```

### 3. Location Model

```dart
class LocationModel {
  final String address;
  final double latitude;
  final double longitude;
  final String? googlePlaceId;
  final int geofenceRadius;
  
  LocationModel({
    required this.address,
    required this.latitude,
    required this.longitude,
    this.googlePlaceId,
    this.geofenceRadius = 100,
  });
  
  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      address: json['address'],
      latitude: json['latitude'].toDouble(),
      longitude: json['longitude'].toDouble(),
      googlePlaceId: json['googlePlaceId'],
      geofenceRadius: json['geofenceRadius'] ?? 100,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'googlePlaceId': googlePlaceId,
      'geofenceRadius': geofenceRadius,
    };
  }
}
```

### 4. Team Access Model

```dart
class TeamAccess {
  final String id;
  final String managedUserId;
  final String role;
  final TeamPermissions permissions;
  final DateTime? expiresAt;
  final String status;
  
  TeamAccess({
    required this.id,
    required this.managedUserId,
    required this.role,
    required this.permissions,
    this.expiresAt,
    required this.status,
  });
  
  factory TeamAccess.fromJson(Map<String, dynamic> json) {
    return TeamAccess(
      id: json['_id'],
      managedUserId: json['managedUserId'],
      role: json['role'],
      permissions: TeamPermissions.fromJson(json['permissions']),
      expiresAt: json['expiresAt'] != null ? DateTime.parse(json['expiresAt']) : null,
      status: json['status'],
    );
  }
}

class TeamPermissions {
  final bool canCreateJobs;
  final bool canEditJobs;
  final bool canViewJobs;
  final bool canHireWorkers;
  final bool canViewApplications;
  final bool canManageApplications;
  final bool canCreateAttendance;
  final bool canViewAttendance;
  
  TeamPermissions({
    required this.canCreateJobs,
    required this.canEditJobs,
    required this.canViewJobs,
    required this.canHireWorkers,
    required this.canViewApplications,
    required this.canManageApplications,
    required this.canCreateAttendance,
    required this.canViewAttendance,
  });
  
  factory TeamPermissions.fromJson(Map<String, dynamic> json) {
    return TeamPermissions(
      canCreateJobs: json['canCreateJobs'] ?? false,
      canEditJobs: json['canEditJobs'] ?? false,
      canViewJobs: json['canViewJobs'] ?? false,
      canHireWorkers: json['canHireWorkers'] ?? false,
      canViewApplications: json['canViewApplications'] ?? false,
      canManageApplications: json['canManageApplications'] ?? false,
      canCreateAttendance: json['canCreateAttendance'] ?? false,
      canViewAttendance: json['canViewAttendance'] ?? false,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'canCreateJobs': canCreateJobs,
      'canEditJobs': canEditJobs,
      'canViewJobs': canViewJobs,
      'canHireWorkers': canHireWorkers,
      'canViewApplications': canViewApplications,
      'canManageApplications': canManageApplications,
      'canCreateAttendance': canCreateAttendance,
      'canViewAttendance': canViewAttendance,
    };
  }
}
```

### 5. API Service Methods

```dart
class UserDataService {
  static Future<UserData> getUserDataByUserId(String userId) async {
    final response = await http.get(
      Uri.parse('${ApiService.baseUrl}/users/data/$userId'),
      headers: ApiService().headers,
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return UserData.fromJson(data['data']);
    } else {
      throw Exception('Failed to load user data');
    }
  }
}

class TeamService {
  static Future<void> grantTeamAccess({
    required String targetUserId,
    required String managedUserId,
    required String role,
    required TeamPermissions permissions,
    DateTime? expiresAt,
    String? reason,
  }) async {
    final body = {
      'targetUserId': targetUserId,
      'managedUserId': managedUserId,
      'role': role,
      'permissions': permissions.toJson(),
      if (expiresAt != null) 'expiresAt': expiresAt.toIso8601String(),
      if (reason != null) 'reason': reason,
    };
    
    final response = await http.post(
      Uri.parse('${ApiService.baseUrl}/team/grant-access'),
      headers: ApiService().headers,
      body: json.encode(body),
    );
    
    if (response.statusCode != 201) {
      throw Exception('Failed to grant team access');
    }
  }
  
  static Future<List<TeamAccess>> getMyTeamMembers() async {
    final response = await http.get(
      Uri.parse('${ApiService.baseUrl}/team/my-team'),
      headers: ApiService().headers,
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return (data['data']['teamMembers'] as List)
          .map((e) => TeamAccess.fromJson(e))
          .toList();
    } else {
      throw Exception('Failed to load team members');
    }
  }
}
```

### 6. Location Services

```dart
class LocationService {
  static Future<LocationModel?> getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return null;
      }
      
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return null;
        }
      }
      
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      return LocationModel(
        address: '', // Get from reverse geocoding
        latitude: position.latitude,
        longitude: position.longitude,
      );
    } catch (e) {
      print('Error getting location: $e');
      return null;
    }
  }
  
  static double calculateDistance(
    double lat1, double lon1,
    double lat2, double lon2,
  ) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }
  
  static bool isWithinGeofence(
    LocationModel userLocation,
    LocationModel jobLocation,
    int radiusMeters,
  ) {
    double distance = calculateDistance(
      userLocation.latitude, userLocation.longitude,
      jobLocation.latitude, jobLocation.longitude,
    );
    return distance <= radiusMeters;
  }
}
```

### 7. Attendance Service with Location

```dart
class AttendanceService {
  static Future<void> createAttendance({
    required String jobId,
    required String type, // 'check-in' or 'check-out'
    LocationModel? location,
    String? notes,
  }) async {
    final body = {
      'jobId': jobId,
      'type': type,
      if (location != null) 'location': {
        'latitude': location.latitude,
        'longitude': location.longitude,
        'accuracy': 5, // GPS accuracy in meters
      },
      if (notes != null) 'notes': notes,
    };
    
    final response = await http.post(
      Uri.parse('${ApiService.baseUrl}/attendance'),
      headers: ApiService().headers,
      body: json.encode(body),
    );
    
    if (response.statusCode != 201) {
      throw Exception('Failed to create attendance record');
    }
  }
}
```

---

## Data Models

### User Model (Enhanced)
```javascript
{
  userId: "A1B2C3D4", // Auto-generated
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  role: "employer",
  isVerified: true,
  createdAt: "2025-10-04T10:00:00.000Z"
}
```

### Job Model (Enhanced)
```javascript
{
  _id: "job_id",
  userId: "A1B2C3D4",
  title: "Construction Worker",
  description: "Building construction work",
  location: {
    address: "123 Main St, City, State",
    latitude: 40.7128,
    longitude: -74.0060,
    googlePlaceId: "ChIJOwg_06VPwokRYv534QaPC8g",
    geofenceRadius: 150
  },
  salary: 25,
  salaryType: "hourly",
  requirements: ["Physical fitness"],
  workingHours: {
    start: "08:00",
    end: "17:00"
  },
  status: "active",
  createdAt: "2025-10-04T10:00:00.000Z"
}
```

### Attendance Model (Enhanced)
```javascript
{
  _id: "attendance_id",
  userId: "A1B2C3D4",
  jobId: "job_id",
  workerId: "worker_id",
  type: "check-in",
  timestamp: "2025-10-04T08:00:00.000Z",
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 5,
    timestamp: "2025-10-04T08:00:00.000Z",
    isWithinGeofence: true,
    distanceFromJob: 25
  },
  notes: "Started morning shift",
  status: "confirmed"
}
```

### Team Access Model
```javascript
{
  _id: "team_access_id",
  grantedBy: "user_object_id",
  targetUser: "user_object_id",
  managedUserId: "A1B2C3D4",
  role: "manager",
  permissions: {
    canCreateJobs: true,
    canEditJobs: true,
    canViewJobs: true,
    canHireWorkers: true,
    canViewApplications: true,
    canManageApplications: true,
    canCreateAttendance: true,
    canViewAttendance: true,
    canEditAttendance: false,
    canManageEmployment: false,
    canViewEmployment: true,
    canViewPayments: false,
    canProcessPayments: false,
    canManageTeam: false,
    canViewTeamReports: false
  },
  restrictions: {
    startDate: "2025-10-01",
    endDate: "2025-12-31"
  },
  status: "active",
  grantedAt: "2025-10-04T10:00:00.000Z",
  expiresAt: "2025-12-31T23:59:59.000Z",
  lastAccessAt: "2025-10-04T15:30:00.000Z",
  accessCount: 15,
  reason: "Temporary manager access for Q4 operations"
}
```

---

## Error Handling

### Common Error Responses
```javascript
// Unauthorized Access
{
  "status": "error",
  "message": "You don't have permission to access this user's data",
  "code": "TEAM_ACCESS_DENIED",
  "details": {
    "requiredPermission": "canViewJobs",
    "userRole": "viewer",
    "managedUserId": "A1B2C3D4"
  }
}

// Location Validation Error
{
  "status": "error",
  "message": "Attendance location is outside the job geofence",
  "code": "GEOFENCE_VIOLATION",
  "details": {
    "distance": 250,
    "allowedRadius": 150,
    "jobLocation": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
}

// Team Access Expired
{
  "status": "error",
  "message": "Team access has expired",
  "code": "ACCESS_EXPIRED",
  "details": {
    "expiredAt": "2025-09-30T23:59:59.000Z",
    "managedUserId": "A1B2C3D4"
  }
}
```

---

## Security Considerations

### 1. Token Validation
- All endpoints require valid JWT tokens
- Team access tokens include additional permission validation

### 2. Permission Checking
- Middleware validates permissions before data access
- Role-based access control enforced at database level

### 3. Location Security
- GPS coordinates validated for accuracy
- Geofence violations logged for audit

### 4. Audit Trail
- All team access activities logged
- Access patterns monitored for security

---

## Testing Recommendations

### 1. Unit Tests
- Test permission validation logic
- Test geofence calculations
- Test userId generation uniqueness

### 2. Integration Tests
- Test team access workflows
- Test location-based attendance
- Test data aggregation endpoints

### 3. Security Tests
- Test unauthorized access attempts
- Test permission escalation scenarios
- Test expired access handling

---

This documentation provides a comprehensive guide for implementing the enhanced WorkConnect backend features in Flutter applications.