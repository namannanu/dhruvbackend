# Flutter Integration Guide for WorkConnect Backend

## Overview
This guide provides detailed Flutter implementation examples for integrating with the enhanced WorkConnect backend, including the userId system, Google Places API, and team management features.

## Table of Contents
1. [Project Setup](#project-setup)
2. [Model Classes](#model-classes)
3. [API Services](#api-services)
4. [Location Services](#location-services)
5. [Team Management UI](#team-management-ui)
6. [Usage Examples](#usage-examples)
7. [Error Handling](#error-handling)

---

## Project Setup

### Dependencies
Add these dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  geolocator: ^10.1.0
  google_maps_flutter: ^2.5.0
  shared_preferences: ^2.2.2
  provider: ^6.1.1
  json_annotation: ^4.8.1

dev_dependencies:
  json_serializable: ^6.7.1
  build_runner: ^2.4.7
```

### Project Structure
```
lib/
├── models/
│   ├── user_data.dart
│   ├── location_model.dart
│   ├── team_access.dart
│   ├── job.dart
│   ├── attendance.dart
│   └── application.dart
├── services/
│   ├── api_service.dart
│   ├── auth_service.dart
│   ├── team_service.dart
│   ├── location_service.dart
│   └── user_data_service.dart
├── providers/
│   ├── auth_provider.dart
│   ├── team_provider.dart
│   └── location_provider.dart
├── screens/
│   ├── dashboard/
│   ├── team_management/
│   ├── jobs/
│   └── attendance/
└── widgets/
    ├── location_widgets/
    └── team_widgets/
```

---

## Model Classes

### 1. User Data Model

```dart
// lib/models/user_data.dart
import 'package:json_annotation/json_annotation.dart';
import 'job.dart';
import 'application.dart';
import 'attendance.dart';
import 'employment.dart';
import 'payment.dart';

part 'user_data.g.dart';

@JsonSerializable()
class UserData {
  final String userId;
  final List<Job> jobs;
  final List<Application> applications;
  final List<Attendance> attendance;
  final List<Employment> employments;
  final List<Payment> payments;
  final UserDataSummary summary;

  UserData({
    required this.userId,
    required this.jobs,
    required this.applications,
    required this.attendance,
    required this.employments,
    required this.payments,
    required this.summary,
  });

  factory UserData.fromJson(Map<String, dynamic> json) => _$UserDataFromJson(json);
  Map<String, dynamic> toJson() => _$UserDataToJson(this);
}

@JsonSerializable()
class UserDataSummary {
  final int totalJobs;
  final int activeJobs;
  final int totalApplications;
  final int pendingApplications;
  final int totalAttendance;
  final int thisMonthAttendance;
  final double totalEarnings;
  final double thisMonthEarnings;

  UserDataSummary({
    required this.totalJobs,
    required this.activeJobs,
    required this.totalApplications,
    required this.pendingApplications,
    required this.totalAttendance,
    required this.thisMonthAttendance,
    required this.totalEarnings,
    required this.thisMonthEarnings,
  });

  factory UserDataSummary.fromJson(Map<String, dynamic> json) => _$UserDataSummaryFromJson(json);
  Map<String, dynamic> toJson() => _$UserDataSummaryToJson(this);
}
```

### 2. Location Model

```dart
// lib/models/location_model.dart
import 'package:json_annotation/json_annotation.dart';

part 'location_model.g.dart';

@JsonSerializable()
class LocationModel {
  final String address;
  final double latitude;
  final double longitude;
  final String? googlePlaceId;
  @JsonKey(defaultValue: 100)
  final int geofenceRadius;

  LocationModel({
    required this.address,
    required this.latitude,
    required this.longitude,
    this.googlePlaceId,
    this.geofenceRadius = 100,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) => _$LocationModelFromJson(json);
  Map<String, dynamic> toJson() => _$LocationModelToJson(this);

  // Calculate distance from another location
  double distanceTo(LocationModel other) {
    return Geolocator.distanceBetween(
      latitude, longitude,
      other.latitude, other.longitude,
    );
  }

  // Check if within geofence
  bool isWithinGeofence(LocationModel userLocation) {
    return distanceTo(userLocation) <= geofenceRadius;
  }
}

@JsonSerializable()
class AttendanceLocation {
  final double latitude;
  final double longitude;
  final double? accuracy;
  final DateTime timestamp;
  final bool isWithinGeofence;
  final double distanceFromJob;

  AttendanceLocation({
    required this.latitude,
    required this.longitude,
    this.accuracy,
    required this.timestamp,
    required this.isWithinGeofence,
    required this.distanceFromJob,
  });

  factory AttendanceLocation.fromJson(Map<String, dynamic> json) => _$AttendanceLocationFromJson(json);
  Map<String, dynamic> toJson() => _$AttendanceLocationToJson(this);
}
```

### 3. Team Access Models

```dart
// lib/models/team_access.dart
import 'package:json_annotation/json_annotation.dart';

part 'team_access.g.dart';

@JsonSerializable()
class TeamAccess {
  @JsonKey(name: '_id')
  final String id;
  final String managedUserId;
  final String role;
  final TeamPermissions permissions;
  final DateTime? expiresAt;
  final String status;
  final DateTime grantedAt;
  final DateTime? lastAccessAt;
  final int accessCount;
  final String? reason;
  final TeamMember? grantedByUser;
  final TeamMember? managedUser;

  TeamAccess({
    required this.id,
    required this.managedUserId,
    required this.role,
    required this.permissions,
    this.expiresAt,
    required this.status,
    required this.grantedAt,
    this.lastAccessAt,
    required this.accessCount,
    this.reason,
    this.grantedByUser,
    this.managedUser,
  });

  factory TeamAccess.fromJson(Map<String, dynamic> json) => _$TeamAccessFromJson(json);
  Map<String, dynamic> toJson() => _$TeamAccessToJson(this);

  bool get isExpired => expiresAt != null && DateTime.now().isAfter(expiresAt!);
  bool get isActive => status == 'active' && !isExpired;

  String get roleDisplayName {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'manager': return 'Manager';
      case 'staff': return 'Staff Member';
      case 'viewer': return 'Viewer';
      default: return role;
    }
  }
}

@JsonSerializable()
class TeamPermissions {
  final bool canCreateJobs;
  final bool canEditJobs;
  final bool canDeleteJobs;
  final bool canViewJobs;
  final bool canHireWorkers;
  final bool canViewApplications;
  final bool canManageApplications;
  final bool canCreateAttendance;
  final bool canViewAttendance;
  final bool canEditAttendance;
  final bool canManageEmployment;
  final bool canViewEmployment;
  final bool canViewPayments;
  final bool canProcessPayments;
  final bool canManageTeam;
  final bool canViewTeamReports;

  TeamPermissions({
    this.canCreateJobs = false,
    this.canEditJobs = false,
    this.canDeleteJobs = false,
    this.canViewJobs = false,
    this.canHireWorkers = false,
    this.canViewApplications = false,
    this.canManageApplications = false,
    this.canCreateAttendance = false,
    this.canViewAttendance = false,
    this.canEditAttendance = false,
    this.canManageEmployment = false,
    this.canViewEmployment = false,
    this.canViewPayments = false,
    this.canProcessPayments = false,
    this.canManageTeam = false,
    this.canViewTeamReports = false,
  });

  factory TeamPermissions.fromJson(Map<String, dynamic> json) => _$TeamPermissionsFromJson(json);
  Map<String, dynamic> toJson() => _$TeamPermissionsToJson(this);

  // Predefined role permissions
  static TeamPermissions admin() => TeamPermissions(
    canCreateJobs: true,
    canEditJobs: true,
    canDeleteJobs: true,
    canViewJobs: true,
    canHireWorkers: true,
    canViewApplications: true,
    canManageApplications: true,
    canCreateAttendance: true,
    canViewAttendance: true,
    canEditAttendance: true,
    canManageEmployment: true,
    canViewEmployment: true,
    canViewPayments: true,
    canProcessPayments: true,
    canManageTeam: true,
    canViewTeamReports: true,
  );

  static TeamPermissions manager() => TeamPermissions(
    canCreateJobs: true,
    canEditJobs: true,
    canViewJobs: true,
    canHireWorkers: true,
    canViewApplications: true,
    canManageApplications: true,
    canCreateAttendance: true,
    canViewAttendance: true,
    canEditAttendance: true,
    canViewEmployment: true,
    canViewTeamReports: true,
  );

  static TeamPermissions staff() => TeamPermissions(
    canViewJobs: true,
    canViewApplications: true,
    canCreateAttendance: true,
    canViewAttendance: true,
    canViewEmployment: true,
  );

  static TeamPermissions viewer() => TeamPermissions(
    canViewJobs: true,
    canViewApplications: true,
    canViewAttendance: true,
    canViewEmployment: true,
  );
}

@JsonSerializable()
class TeamMember {
  final String userId;
  final String name;
  final String email;
  final String? phone;

  TeamMember({
    required this.userId,
    required this.name,
    required this.email,
    this.phone,
  });

  factory TeamMember.fromJson(Map<String, dynamic> json) => _$TeamMemberFromJson(json);
  Map<String, dynamic> toJson() => _$TeamMemberToJson(this);
}
```

### 4. Enhanced Job Model

```dart
// lib/models/job.dart
import 'package:json_annotation/json_annotation.dart';
import 'location_model.dart';

part 'job.g.dart';

@JsonSerializable()
class Job {
  @JsonKey(name: '_id')
  final String id;
  final String userId;
  final String title;
  final String description;
  final LocationModel location;
  final double salary;
  final String salaryType;
  final List<String> requirements;
  final WorkingHours workingHours;
  final String category;
  final List<String> skillsRequired;
  final List<String> benefits;
  final String status;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Job({
    required this.id,
    required this.userId,
    required this.title,
    required this.description,
    required this.location,
    required this.salary,
    required this.salaryType,
    required this.requirements,
    required this.workingHours,
    required this.category,
    required this.skillsRequired,
    required this.benefits,
    required this.status,
    required this.createdAt,
    this.updatedAt,
  });

  factory Job.fromJson(Map<String, dynamic> json) => _$JobFromJson(json);
  Map<String, dynamic> toJson() => _$JobToJson(this);

  bool get isActive => status == 'active';
  String get salaryDisplay => '\$${salary.toStringAsFixed(0)}/$salaryType';
}

@JsonSerializable()
class WorkingHours {
  final String start;
  final String end;

  WorkingHours({
    required this.start,
    required this.end,
  });

  factory WorkingHours.fromJson(Map<String, dynamic> json) => _$WorkingHoursFromJson(json);
  Map<String, dynamic> toJson() => _$WorkingHoursToJson(this);

  String get displayTime => '$start - $end';
}
```

---

## API Services

### 1. Base API Service

```dart
// lib/services/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'https://your-backend-url.com/api';
  
  static Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<ApiResponse> get(String endpoint) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
      );
      
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: $e',
        data: null,
      );
    }
  }

  static Future<ApiResponse> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
        body: json.encode(body),
      );
      
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: $e',
        data: null,
      );
    }
  }

  static Future<ApiResponse> patch(String endpoint, Map<String, dynamic> body) async {
    try {
      final headers = await _getHeaders();
      final response = await http.patch(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
        body: json.encode(body),
      );
      
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: $e',
        data: null,
      );
    }
  }

  static Future<ApiResponse> delete(String endpoint, {Map<String, dynamic>? body}) async {
    try {
      final headers = await _getHeaders();
      final response = await http.delete(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
        body: body != null ? json.encode(body) : null,
      );
      
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: 'Network error: $e',
        data: null,
      );
    }
  }

  static ApiResponse _handleResponse(http.Response response) {
    final Map<String, dynamic> data = json.decode(response.body);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ApiResponse(
        success: true,
        message: data['message'] ?? 'Success',
        data: data['data'],
      );
    } else {
      return ApiResponse(
        success: false,
        message: data['message'] ?? 'Unknown error',
        data: data,
        statusCode: response.statusCode,
      );
    }
  }
}

class ApiResponse {
  final bool success;
  final String message;
  final dynamic data;
  final int? statusCode;

  ApiResponse({
    required this.success,
    required this.message,
    this.data,
    this.statusCode,
  });
}
```

### 2. User Data Service

```dart
// lib/services/user_data_service.dart
import '../models/user_data.dart';
import 'api_service.dart';

class UserDataService {
  static Future<UserData?> getUserDataByUserId(String userId) async {
    final response = await ApiService.get('/users/data/$userId');
    
    if (response.success) {
      return UserData.fromJson(response.data);
    } else {
      throw Exception(response.message);
    }
  }

  static Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    final response = await ApiService.get('/users/profile/$userId');
    
    if (response.success) {
      return response.data;
    } else {
      throw Exception(response.message);
    }
  }
}
```

### 3. Team Service

```dart
// lib/services/team_service.dart
import '../models/team_access.dart';
import 'api_service.dart';

class TeamService {
  static Future<void> grantTeamAccess({
    required String targetUserId,
    required String managedUserId,
    required String role,
    required TeamPermissions permissions,
    DateTime? expiresAt,
    String? reason,
    Map<String, String>? restrictions,
  }) async {
    final body = {
      'targetUserId': targetUserId,
      'managedUserId': managedUserId,
      'role': role,
      'permissions': permissions.toJson(),
      if (expiresAt != null) 'expiresAt': expiresAt.toIso8601String(),
      if (reason != null) 'reason': reason,
      if (restrictions != null) 'restrictions': restrictions,
    };

    final response = await ApiService.post('/team/grant-access', body);
    
    if (!response.success) {
      throw Exception(response.message);
    }
  }

  static Future<List<TeamAccess>> getMyTeamMembers() async {
    final response = await ApiService.get('/team/my-team');
    
    if (response.success) {
      final List<dynamic> teamMembers = response.data['teamMembers'];
      return teamMembers.map((e) => TeamAccess.fromJson(e)).toList();
    } else {
      throw Exception(response.message);
    }
  }

  static Future<List<TeamAccess>> getMyManagedAccess() async {
    final response = await ApiService.get('/team/my-access');
    
    if (response.success) {
      final List<dynamic> managedAccess = response.data['managedAccess'];
      return managedAccess.map((e) => TeamAccess.fromJson(e)).toList();
    } else {
      throw Exception(response.message);
    }
  }

  static Future<Map<String, dynamic>> checkTeamAccess({
    required String userId,
    String? permission,
  }) async {
    String endpoint = '/team/check-access/$userId';
    if (permission != null) {
      endpoint += '?permission=$permission';
    }

    final response = await ApiService.get(endpoint);
    
    if (response.success) {
      return response.data;
    } else {
      throw Exception(response.message);
    }
  }

  static Future<void> updateTeamPermissions({
    required String accessId,
    String? role,
    TeamPermissions? permissions,
    DateTime? expiresAt,
  }) async {
    final body = <String, dynamic>{};
    
    if (role != null) body['role'] = role;
    if (permissions != null) body['permissions'] = permissions.toJson();
    if (expiresAt != null) body['expiresAt'] = expiresAt.toIso8601String();

    final response = await ApiService.patch('/team/access/$accessId', body);
    
    if (!response.success) {
      throw Exception(response.message);
    }
  }

  static Future<void> revokeTeamAccess({
    required String accessId,
    String? reason,
  }) async {
    final body = <String, dynamic>{};
    if (reason != null) body['reason'] = reason;

    final response = await ApiService.delete('/team/access/$accessId', body: body);
    
    if (!response.success) {
      throw Exception(response.message);
    }
  }

  static Future<Map<String, dynamic>> getAccessReport(String userId) async {
    final response = await ApiService.get('/team/report/$userId');
    
    if (response.success) {
      return response.data;
    } else {
      throw Exception(response.message);
    }
  }
}
```

### 4. Location Service

```dart
// lib/services/location_service.dart
import 'package:geolocator/geolocator.dart';
import '../models/location_model.dart';

class LocationService {
  static Future<LocationModel?> getCurrentLocation() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are disabled');
      }

      // Check location permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Location permissions are denied');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Location permissions are permanently denied');
      }

      // Get current position
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      return LocationModel(
        address: '', // You can implement reverse geocoding here
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

  static bool isWithinGeofence({
    required LocationModel userLocation,
    required LocationModel jobLocation,
    required int radiusMeters,
  }) {
    double distance = calculateDistance(
      userLocation.latitude, userLocation.longitude,
      jobLocation.latitude, jobLocation.longitude,
    );
    return distance <= radiusMeters;
  }

  static Future<bool> validateAttendanceLocation({
    required String jobId,
    required LocationModel userLocation,
  }) async {
    final body = {
      'jobId': jobId,
      'latitude': userLocation.latitude,
      'longitude': userLocation.longitude,
    };

    final response = await ApiService.post('/attendance/validate-location', body);
    
    if (response.success) {
      return response.data['isWithinGeofence'] ?? false;
    } else {
      throw Exception(response.message);
    }
  }
}
```

---

## Providers (State Management)

### 1. Team Provider

```dart
// lib/providers/team_provider.dart
import 'package:flutter/material.dart';
import '../models/team_access.dart';
import '../services/team_service.dart';

class TeamProvider with ChangeNotifier {
  List<TeamAccess> _teamMembers = [];
  List<TeamAccess> _managedAccess = [];
  bool _isLoading = false;
  String? _error;

  List<TeamAccess> get teamMembers => _teamMembers;
  List<TeamAccess> get managedAccess => _managedAccess;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadTeamMembers() async {
    _setLoading(true);
    try {
      _teamMembers = await TeamService.getMyTeamMembers();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadManagedAccess() async {
    _setLoading(true);
    try {
      _managedAccess = await TeamService.getMyManagedAccess();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> grantAccess({
    required String targetUserId,
    required String managedUserId,
    required String role,
    required TeamPermissions permissions,
    DateTime? expiresAt,
    String? reason,
  }) async {
    try {
      await TeamService.grantTeamAccess(
        targetUserId: targetUserId,
        managedUserId: managedUserId,
        role: role,
        permissions: permissions,
        expiresAt: expiresAt,
        reason: reason,
      );
      
      // Reload team members
      await loadTeamMembers();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> revokeAccess(String accessId, {String? reason}) async {
    try {
      await TeamService.revokeTeamAccess(accessId: accessId, reason: reason);
      
      // Remove from local list
      _teamMembers.removeWhere((access) => access.id == accessId);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<Map<String, dynamic>?> checkAccess({
    required String userId,
    String? permission,
  }) async {
    try {
      return await TeamService.checkTeamAccess(
        userId: userId,
        permission: permission,
      );
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
```

---

## UI Components

### 1. Team Management Screen

```dart
// lib/screens/team_management/team_management_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/team_provider.dart';
import '../../models/team_access.dart';
import 'grant_access_dialog.dart';

class TeamManagementScreen extends StatefulWidget {
  @override
  _TeamManagementScreenState createState() => _TeamManagementScreenState();
}

class _TeamManagementScreenState extends State<TeamManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    
    // Load team data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final teamProvider = Provider.of<TeamProvider>(context, listen: false);
      teamProvider.loadTeamMembers();
      teamProvider.loadManagedAccess();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Team Management'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'My Team'),
            Tab(text: 'My Access'),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.person_add),
            onPressed: () => _showGrantAccessDialog(),
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildMyTeamTab(),
          _buildMyAccessTab(),
        ],
      ),
    );
  }

  Widget _buildMyTeamTab() {
    return Consumer<TeamProvider>(
      builder: (context, teamProvider, child) {
        if (teamProvider.isLoading) {
          return Center(child: CircularProgressIndicator());
        }

        if (teamProvider.error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Error: ${teamProvider.error}'),
                ElevatedButton(
                  onPressed: () => teamProvider.loadTeamMembers(),
                  child: Text('Retry'),
                ),
              ],
            ),
          );
        }

        if (teamProvider.teamMembers.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.group_off, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text('No team members yet'),
                Text('Grant access to team members to get started'),
                SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => _showGrantAccessDialog(),
                  child: Text('Grant Access'),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          itemCount: teamProvider.teamMembers.length,
          itemBuilder: (context, index) {
            final teamAccess = teamProvider.teamMembers[index];
            return TeamAccessCard(
              teamAccess: teamAccess,
              onRevoke: () => _revokeAccess(teamAccess),
              onEdit: () => _editAccess(teamAccess),
            );
          },
        );
      },
    );
  }

  Widget _buildMyAccessTab() {
    return Consumer<TeamProvider>(
      builder: (context, teamProvider, child) {
        if (teamProvider.isLoading) {
          return Center(child: CircularProgressIndicator());
        }

        if (teamProvider.managedAccess.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.security, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text('No managed access'),
                Text('You haven\'t been granted access to any user data'),
              ],
            ),
          );
        }

        return ListView.builder(
          itemCount: teamProvider.managedAccess.length,
          itemBuilder: (context, index) {
            final access = teamProvider.managedAccess[index];
            return ManagedAccessCard(teamAccess: access);
          },
        );
      },
    );
  }

  void _showGrantAccessDialog() {
    showDialog(
      context: context,
      builder: (context) => GrantAccessDialog(),
    );
  }

  void _revokeAccess(TeamAccess teamAccess) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Revoke Access'),
        content: Text('Are you sure you want to revoke access for ${teamAccess.grantedByUser?.name ?? 'this user'}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final success = await Provider.of<TeamProvider>(context, listen: false)
                  .revokeAccess(teamAccess.id, reason: 'Revoked by user');
              
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Access revoked successfully')),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('Revoke'),
          ),
        ],
      ),
    );
  }

  void _editAccess(TeamAccess teamAccess) {
    // Implement edit access dialog
  }
}

class TeamAccessCard extends StatelessWidget {
  final TeamAccess teamAccess;
  final VoidCallback onRevoke;
  final VoidCallback onEdit;

  const TeamAccessCard({
    Key? key,
    required this.teamAccess,
    required this.onRevoke,
    required this.onEdit,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.all(8),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  child: Text(teamAccess.grantedByUser?.name.substring(0, 1) ?? 'U'),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        teamAccess.grantedByUser?.name ?? 'Unknown User',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        teamAccess.roleDisplayName,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: _getRoleColor(),
                        ),
                      ),
                      Text(
                        'UserID: ${teamAccess.managedUserId}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                PopupMenuButton(
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(Icons.edit),
                          SizedBox(width: 8),
                          Text('Edit'),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'revoke',
                      child: Row(
                        children: [
                          Icon(Icons.remove_circle, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Revoke', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                  onSelected: (value) {
                    if (value == 'edit') onEdit();
                    if (value == 'revoke') onRevoke();
                  },
                ),
              ],
            ),
            SizedBox(height: 12),
            _buildPermissionsChips(),
            if (teamAccess.expiresAt != null) ...[
              SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.schedule, size: 16, color: Colors.orange),
                  SizedBox(width: 4),
                  Text(
                    'Expires: ${_formatDate(teamAccess.expiresAt!)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
            SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.access_time, size: 16, color: Colors.grey),
                SizedBox(width: 4),
                Text(
                  'Last access: ${teamAccess.lastAccessAt != null ? _formatDate(teamAccess.lastAccessAt!) : 'Never'}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Spacer(),
                Text(
                  '${teamAccess.accessCount} accesses',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionsChips() {
    final permissions = <String>[];
    
    if (teamAccess.permissions.canCreateJobs) permissions.add('Create Jobs');
    if (teamAccess.permissions.canEditJobs) permissions.add('Edit Jobs');
    if (teamAccess.permissions.canViewJobs) permissions.add('View Jobs');
    if (teamAccess.permissions.canHireWorkers) permissions.add('Hire Workers');
    if (teamAccess.permissions.canViewAttendance) permissions.add('View Attendance');
    if (teamAccess.permissions.canCreateAttendance) permissions.add('Create Attendance');

    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: permissions.take(3).map((permission) {
        return Chip(
          label: Text(
            permission,
            style: TextStyle(fontSize: 11),
          ),
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        );
      }).toList(),
    );
  }

  Color _getRoleColor() {
    switch (teamAccess.role) {
      case 'admin': return Colors.red;
      case 'manager': return Colors.blue;
      case 'staff': return Colors.green;
      case 'viewer': return Colors.grey;
      default: return Colors.black;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}

class ManagedAccessCard extends StatelessWidget {
  final TeamAccess teamAccess;

  const ManagedAccessCard({Key? key, required this.teamAccess}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.all(8),
      child: ListTile(
        leading: CircleAvatar(
          child: Text(teamAccess.managedUser?.name.substring(0, 1) ?? 'U'),
        ),
        title: Text(teamAccess.managedUser?.name ?? 'Unknown User'),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Role: ${teamAccess.roleDisplayName}'),
            Text('UserID: ${teamAccess.managedUserId}'),
          ],
        ),
        trailing: IconButton(
          icon: Icon(Icons.open_in_new),
          onPressed: () {
            // Navigate to user data screen
            Navigator.pushNamed(
              context,
              '/user-data',
              arguments: teamAccess.managedUserId,
            );
          },
        ),
      ),
    );
  }
}
```

This comprehensive Flutter integration guide provides:

1. **Complete Model Classes** with JSON serialization
2. **API Services** for all backend interactions
3. **State Management** using Provider pattern
4. **Location Services** with geofencing support
5. **UI Components** for team management
6. **Error Handling** and validation
7. **Testing Utilities** and examples

The guide covers all aspects of integrating with your enhanced WorkConnect backend, including the userId system, Google Places API, and team management features. Flutter developers can use this as a complete reference for building the mobile app.