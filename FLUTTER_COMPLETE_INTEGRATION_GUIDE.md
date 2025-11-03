# 🚀 Flutter Integration Guide for Job Creation & Management System

## 📋 Table of Contents
1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Authentication](#authentication)
4. [Data Models](#data-models)
5. [Implementation Examples](#implementation-examples)
6. [UI Components](#ui-components)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## 🔍 Overview

This guide helps Flutter developers integrate with the job creation and management backend system. The system automatically handles business address integration when creating jobs, making it easy for employees to create jobs with complete location data.

### Key Features
- ✅ **Automatic Address Integration**: Select business ID → Address auto-populated
- ✅ **Real-time Job Management**: Create, fetch, and manage jobs
- ✅ **Worker Application Tracking**: Track application status
- ✅ **Role-based Access**: Different views for employers and workers
- ✅ **Location Services**: Complete address and coordinate data

---

## 🌐 API Endpoints

### Base URL
```dart
const String baseUrl = 'http://localhost:3000/api';
```

### Authentication Endpoints
```dart
POST /auth/login          // Login user
POST /auth/signup         // Register user
GET  /auth/me            // Get current user info
```

### Business Endpoints
```dart
GET  /businesses         // Get all businesses (for job creation)
```

### Job Endpoints
```dart
GET    /jobs             // Get all jobs (employer/worker view)
POST   /jobs             // Create new job
GET    /jobs/:id         // Get specific job details
PUT    /jobs/:id         // Update job
DELETE /jobs/:id         // Delete job
```

---

## 🔐 Authentication

### 1. Login Implementation

```dart
class AuthService {
  static const String _baseUrl = 'http://localhost:3000/api';
  
  static Future<AuthResponse> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        
        // Store token securely
        await _storeToken(data['token']);
        
        return AuthResponse.fromJson(data);
      } else {
        throw Exception('Login failed: ${response.body}');
      }
    } catch (e) {
      throw Exception('Login error: $e');
    }
  }
  
  static Future<void> _storeToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }
  
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }
  
  static Future<Map<String, String>> getAuthHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
}
```

### 2. Auth Response Model

```dart
class AuthResponse {
  final String token;
  final User user;
  
  AuthResponse({
    required this.token,
    required this.user,
  });
  
  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      token: json['token'] ?? '',
      user: User.fromJson(json['data']['user'] ?? {}),
    );
  }
}

class User {
  final String id;
  final String email;
  final String userType; // 'employer' or 'worker'
  final String firstName;
  final String lastName;
  final bool premium;
  
  User({
    required this.id,
    required this.email,
    required this.userType,
    required this.firstName,
    required this.lastName,
    required this.premium,
  });
  
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? '',
      email: json['email'] ?? '',
      userType: json['userType'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      premium: json['premium'] ?? false,
    );
  }
  
  String get fullName => '$firstName $lastName';
  bool get isEmployer => userType == 'employer';
  bool get isWorker => userType == 'worker';
}

class EmployerProfile {
  final String id;
  final String companyName;
  final String? description;
  final String? phone;
  final String? profilePictureSmall;
  final String? profilePictureMedium;
  final String? companyLogoSmall;
  final String? companyLogoLarge;
  final double rating;
  final int totalJobsPosted;
  final int totalHires;
  
  EmployerProfile({
    required this.id,
    required this.companyName,
    this.description,
    this.phone,
    this.profilePictureSmall,
    this.profilePictureMedium,
    this.companyLogoSmall,
    this.companyLogoLarge,
    required this.rating,
    required this.totalJobsPosted,
    required this.totalHires,
  });
  
  factory EmployerProfile.fromJson(Map<String, dynamic> json) {
    return EmployerProfile(
      id: json['_id'] ?? '',
      companyName: json['companyName'] ?? '',
      description: json['description'],
      phone: json['phone'],
      profilePictureSmall: json['profilePictureSmall'],
      profilePictureMedium: json['profilePictureMedium'],
      companyLogoSmall: json['companyLogoSmall'],
      companyLogoLarge: json['companyLogoLarge'],
      rating: (json['rating'] ?? 0).toDouble(),
      totalJobsPosted: json['totalJobsPosted'] ?? 0,
      totalHires: json['totalHires'] ?? 0,
    );
  }
}

class WorkerProfile {
  final String id;
  final String? bio;
  final List<String> skills;
  final String? experience;
  final List<String> languages;
  final String? profilePictureSmall;
  final String? profilePictureMedium;
  final List<String> portfolioThumbnails;
  final List<String> portfolioPreviews;
  final double rating;
  final int completedJobs;
  final double totalEarnings;
  final List<String> availability;
  
  WorkerProfile({
    required this.id,
    this.bio,
    required this.skills,
    this.experience,
    required this.languages,
    this.profilePictureSmall,
    this.profilePictureMedium,
    required this.portfolioThumbnails,
    required this.portfolioPreviews,
    required this.rating,
    required this.completedJobs,
    required this.totalEarnings,
    required this.availability,
  });
  
  factory WorkerProfile.fromJson(Map<String, dynamic> json) {
    return WorkerProfile(
      id: json['_id'] ?? '',
      bio: json['bio'],
      skills: List<String>.from(json['skills'] ?? []),
      experience: json['experience'],
      languages: List<String>.from(json['languages'] ?? []),
      profilePictureSmall: json['profilePictureSmall'],
      profilePictureMedium: json['profilePictureMedium'],
      portfolioThumbnails: List<String>.from(json['portfolioThumbnails'] ?? []),
      portfolioPreviews: List<String>.from(json['portfolioPreviews'] ?? []),
      rating: (json['rating'] ?? 0).toDouble(),
      completedJobs: json['completedJobs'] ?? 0,
      totalEarnings: (json['totalEarnings'] ?? 0).toDouble(),
      availability: List<String>.from(json['availability'] ?? []),
    );
  }
}
```

---

## 📊 Data Models

### 1. Business Model

```dart
class Business {
  final String id;
  final String name;
  final String address;
  final String city;
  final String state;
  final String postalCode;
  final double? latitude;
  final double? longitude;
  final String formattedAddress;
  final bool isActive;
  
  Business({
    required this.id,
    required this.name,
    required this.address,
    required this.city,
    required this.state,
    required this.postalCode,
    this.latitude,
    this.longitude,
    required this.formattedAddress,
    required this.isActive,
  });
  
  factory Business.fromJson(Map<String, dynamic> json) {
    final location = json['location'] ?? {};
    
    return Business(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      address: location['line1'] ?? '',
      city: location['city'] ?? '',
      state: location['state'] ?? '',
      postalCode: location['postalCode'] ?? '',
      latitude: location['latitude']?.toDouble(),
      longitude: location['longitude']?.toDouble(),
      formattedAddress: location['formattedAddress'] ?? '',
      isActive: json['isActive'] ?? false,
    );
  }
  
  String get displayAddress => formattedAddress.isNotEmpty ? formattedAddress : address;
  bool get hasCoordinates => latitude != null && longitude != null;
}
```

### 2. Job Model

```dart
class Job {
  final String id;
  final String title;
  final String description;
  final double hourlyRate;
  final String urgency;
  final List<String> tags;
  final JobSchedule schedule;
  final bool verificationRequired;
  final bool premiumRequired;
  final String status;
  final int applicantsCount;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  // Business Information (Auto-populated)
  final String businessId;
  final String businessName;
  final String businessAddress;
  final JobLocation location;
  
  // Worker-specific fields
  final bool? hasApplied;
  final double? distance;
  final int? matchScore;
  
  Job({
    required this.id,
    required this.title,
    required this.description,
    required this.hourlyRate,
    required this.urgency,
    required this.tags,
    required this.schedule,
    required this.verificationRequired,
    required this.premiumRequired,
    required this.status,
    required this.applicantsCount,
    required this.createdAt,
    required this.updatedAt,
    required this.businessId,
    required this.businessName,
    required this.businessAddress,
    required this.location,
    this.hasApplied,
    this.distance,
    this.matchScore,
  });
  
  factory Job.fromJson(Map<String, dynamic> json) {
    return Job(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      hourlyRate: (json['hourlyRate'] ?? 0).toDouble(),
      urgency: json['urgency'] ?? 'medium',
      tags: List<String>.from(json['tags'] ?? []),
      schedule: JobSchedule.fromJson(json['schedule'] ?? {}),
      verificationRequired: json['verificationRequired'] ?? false,
      premiumRequired: json['premiumRequired'] ?? false,
      status: json['status'] ?? 'active',
      applicantsCount: json['applicantsCount'] ?? 0,
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
      businessId: json['businessId'] ?? '',
      businessName: json['businessName'] ?? '',
      businessAddress: json['businessAddress'] ?? '',
      location: JobLocation.fromJson(json['location'] ?? {}),
      hasApplied: json['hasApplied'],
      distance: json['distance']?.toDouble(),
      matchScore: json['matchScore'],
    );
  }
  
  // Getters for UI display
  String get formattedHourlyRate => '\$${hourlyRate.toStringAsFixed(2)}/hour';
  bool get isActive => status == 'active';
  bool get isUrgent => urgency == 'high';
  String get tagsDisplay => tags.join(', ');
  String get applicantsText => applicantsCount == 1 ? '1 applicant' : '$applicantsCount applicants';
}
```

### 3. Supporting Models

```dart
class JobSchedule {
  final DateTime startDate;
  final DateTime endDate;
  final String startTime;
  final String endTime;
  final String recurrence;
  final List<String> workDays;
  
  JobSchedule({
    required this.startDate,
    required this.endDate,
    required this.startTime,
    required this.endTime,
    required this.recurrence,
    required this.workDays,
  });
  
  factory JobSchedule.fromJson(Map<String, dynamic> json) {
    return JobSchedule(
      startDate: DateTime.parse(json['startDate'] ?? DateTime.now().toIso8601String()),
      endDate: DateTime.parse(json['endDate'] ?? DateTime.now().toIso8601String()),
      startTime: json['startTime'] ?? '',
      endTime: json['endTime'] ?? '',
      recurrence: json['recurrence'] ?? 'one-time',
      workDays: List<String>.from(json['workDays'] ?? []),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'startTime': startTime,
      'endTime': endTime,
      'recurrence': recurrence,
      'workDays': workDays,
    };
  }
  
  String get scheduleDisplay {
    if (recurrence == 'one-time') {
      return 'One-time: ${_formatDate(startDate)} ${startTime} - ${endTime}';
    } else {
      return '${recurrence.toUpperCase()}: ${workDays.join(', ')} ${startTime} - ${endTime}';
    }
  }
  
  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}

class JobLocation {
  final String formattedAddress;
  final String shortAddress;
  final String fullAddress;
  final String city;
  final String state;
  final String country;
  final String postalCode;
  final double? latitude;
  final double? longitude;
  final String label;
  
  JobLocation({
    required this.formattedAddress,
    required this.shortAddress,
    required this.fullAddress,
    required this.city,
    required this.state,
    required this.country,
    required this.postalCode,
    this.latitude,
    this.longitude,
    required this.label,
  });
  
  factory JobLocation.fromJson(Map<String, dynamic> json) {
    return JobLocation(
      formattedAddress: json['formattedAddress'] ?? '',
      shortAddress: json['shortAddress'] ?? '',
      fullAddress: json['fullAddress'] ?? '',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      country: json['country'] ?? '',
      postalCode: json['postalCode'] ?? '',
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      label: json['label'] ?? '',
    );
  }
  
  String get displayAddress => formattedAddress.isNotEmpty ? formattedAddress : fullAddress;
  bool get hasCoordinates => latitude != null && longitude != null;
}
```

---

## 💼 Implementation Examples

### 1. Job Service Class

```dart
class JobService {
  static const String _baseUrl = 'http://localhost:3000/api';
  
  // Fetch all businesses for job creation
  static Future<List<Business>> getBusinesses() async {
    try {
      final headers = await AuthService.getAuthHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/businesses'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        final List<dynamic> businessList = data['data'] ?? data;
        
        return businessList.map((json) => Business.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load businesses: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error fetching businesses: $e');
    }
  }
  
  // Create new job with business address integration
  static Future<Job> createJob(JobCreateRequest request) async {
    try {
      final headers = await AuthService.getAuthHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/jobs'),
        headers: headers,
        body: jsonEncode(request.toJson()),
      );
      
      if (response.statusCode == 201) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return Job.fromJson(data['data'] ?? data);
      } else {
        throw Exception('Failed to create job: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error creating job: $e');
    }
  }
  
  // Fetch jobs (employer or worker view)
  static Future<List<Job>> getJobs() async {
    try {
      final headers = await AuthService.getAuthHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/jobs'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        final List<dynamic> jobList = data['data'] ?? data;
        
        return jobList.map((json) => Job.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load jobs: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error fetching jobs: $e');
    }
  }
  
  // Get specific job details
  static Future<Job> getJobDetails(String jobId) async {
    try {
      final headers = await AuthService.getAuthHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/jobs/$jobId'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return Job.fromJson(data['data'] ?? data);
      } else {
        throw Exception('Failed to load job details: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error fetching job details: $e');
    }
  }
}

class ProfileService {
  static const String _baseUrl = 'http://localhost:3000/api';
  
  // Get employer profile with optimized images
  static Future<EmployerProfile> getEmployerProfile() async {
    try {
      final headers = await AuthService.getAuthHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/employers/profile'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return EmployerProfile.fromJson(data['data'] ?? data);
      } else {
        throw Exception('Failed to load employer profile: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error fetching employer profile: $e');
    }
  }
  
  // Update employer profile with images
  static Future<EmployerProfile> updateEmployerProfile(Map<String, dynamic> updates) async {
    try {
      final headers = await AuthService.getAuthHeaders();
      final response = await http.put(
        Uri.parse('$_baseUrl/employers/profile'),
        headers: headers,
        body: jsonEncode(updates),
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return EmployerProfile.fromJson(data['data'] ?? data);
      } else {
        throw Exception('Failed to update employer profile: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error updating employer profile: $e');
    }
  }
  
  // Get worker profile with optimized images
  static Future<WorkerProfile> getWorkerProfile() async {
    try {
      final headers = await AuthService.getAuthHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/workers/profile'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return WorkerProfile.fromJson(data['data']['profile'] ?? {});
      } else {
        throw Exception('Failed to load worker profile: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error fetching worker profile: $e');
    }
  }
  
  // Update worker profile with images
  static Future<WorkerProfile> updateWorkerProfile(Map<String, dynamic> updates) async {
    try {
      final headers = await AuthService.getAuthHeaders();
      final response = await http.put(
        Uri.parse('$_baseUrl/workers/profile'),
        headers: headers,
        body: jsonEncode(updates),
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return WorkerProfile.fromJson(data['data']['profile'] ?? {});
      } else {
        throw Exception('Failed to update worker profile: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error updating worker profile: $e');
    }
  }
}
```

### 2. Job Creation Request Model

```dart
class JobCreateRequest {
  final String title;
  final String description;
  final double hourlyRate;
  final String urgency;
  final List<String> tags;
  final DateTime scheduleStart;
  final DateTime scheduleEnd;
  final String recurrence;
  final List<String> workDays;
  final bool verificationRequired;
  final bool hasOvertime;
  final double? overtimeRate;
  final String businessId; // This triggers address auto-population
  
  JobCreateRequest({
    required this.title,
    required this.description,
    required this.hourlyRate,
    required this.urgency,
    required this.tags,
    required this.scheduleStart,
    required this.scheduleEnd,
    required this.recurrence,
    required this.workDays,
    required this.verificationRequired,
    required this.hasOvertime,
    this.overtimeRate,
    required this.businessId,
  });
  
  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'hourlyRate': hourlyRate,
      'urgency': urgency,
      'tags': tags,
      'scheduleStart': scheduleStart.toIso8601String(),
      'scheduleEnd': scheduleEnd.toIso8601String(),
      'recurrence': recurrence,
      'workDays': workDays,
      'verificationRequired': verificationRequired,
      'hasOvertime': hasOvertime,
      if (overtimeRate != null) 'overtimeRate': overtimeRate,
      'businessId': businessId, // Key field for address integration
    };
  }
}
```

---

## 🎨 UI Components

### 1. Business Selector Widget

```dart
class BusinessSelector extends StatefulWidget {
  final Function(Business) onBusinessSelected;
  final Business? selectedBusiness;
  
  const BusinessSelector({
    Key? key,
    required this.onBusinessSelected,
    this.selectedBusiness,
  }) : super(key: key);
  
  @override
  _BusinessSelectorState createState() => _BusinessSelectorState();
}

class _BusinessSelectorState extends State<BusinessSelector> {
  List<Business> businesses = [];
  bool isLoading = true;
  String? errorMessage;
  
  @override
  void initState() {
    super.initState();
    _loadBusinesses();
  }
  
  Future<void> _loadBusinesses() async {
    try {
      setState(() {
        isLoading = true;
        errorMessage = null;
      });
      
      final businessList = await JobService.getBusinesses();
      
      setState(() {
        businesses = businessList;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        errorMessage = e.toString();
        isLoading = false;
      });
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.business, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  'Select Business Location',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            
            if (isLoading)
              Center(child: CircularProgressIndicator())
            else if (errorMessage != null)
              _buildErrorWidget()
            else
              _buildBusinessList(),
          ],
        ),
      ),
    );
  }
  
  Widget _buildErrorWidget() {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.error, color: Colors.red),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Failed to load businesses. Tap to retry.',
              style: TextStyle(color: Colors.red.shade700),
            ),
          ),
          TextButton(
            onPressed: _loadBusinesses,
            child: Text('Retry'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildBusinessList() {
    return Column(
      children: businesses.map((business) {
        final isSelected = widget.selectedBusiness?.id == business.id;
        
        return Container(
          margin: EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            border: Border.all(
              color: isSelected ? Colors.blue : Colors.grey.shade300,
              width: isSelected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(8),
            color: isSelected ? Colors.blue.shade50 : Colors.white,
          ),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isSelected ? Colors.blue : Colors.grey.shade400,
              child: Icon(
                Icons.business,
                color: Colors.white,
              ),
            ),
            title: Text(
              business.name,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  business.displayAddress,
                  style: TextStyle(fontSize: 12),
                ),
                if (business.hasCoordinates)
                  Padding(
                    padding: EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        Icon(Icons.location_on, size: 12, color: Colors.green),
                        SizedBox(width: 4),
                        Text(
                          'GPS Available',
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.green,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            trailing: isSelected
                ? Icon(Icons.check_circle, color: Colors.blue)
                : Icon(Icons.radio_button_unchecked, color: Colors.grey),
            onTap: () => widget.onBusinessSelected(business),
          ),
        );
      }).toList(),
    );
  }
}
```

### 2. Job Card Widget

```dart
class JobCard extends StatelessWidget {
  final Job job;
  final bool isWorkerView;
  final VoidCallback? onTap;
  final VoidCallback? onApply;
  
  const JobCard({
    Key? key,
    required this.job,
    this.isWorkerView = false,
    this.onTap,
    this.onApply,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          job.title,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.business, size: 14, color: Colors.grey),
                            SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                job.businessName,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getUrgencyColor(job.urgency).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      job.urgency.toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: _getUrgencyColor(job.urgency),
                      ),
                    ),
                  ),
                ],
              ),
              
              SizedBox(height: 12),
              
              // Hourly Rate
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.attach_money, color: Colors.green, size: 20),
                    Text(
                      job.formattedHourlyRate,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.green.shade700,
                      ),
                    ),
                  ],
                ),
              ),
              
              SizedBox(height: 12),
              
              // Location
              Row(
                children: [
                  Icon(Icons.location_on, size: 16, color: Colors.red),
                  SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      job.location.displayAddress,
                      style: TextStyle(fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              
              SizedBox(height: 8),
              
              // Schedule
              Row(
                children: [
                  Icon(Icons.schedule, size: 16, color: Colors.blue),
                  SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      job.schedule.scheduleDisplay,
                      style: TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
              
              if (job.tags.isNotEmpty) ...[
                SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  children: job.tags.take(3).map((tag) {
                    return Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        tag,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue.shade700,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
              
              SizedBox(height: 12),
              
              // Footer
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (!isWorkerView)
                    Text(
                      job.applicantsText,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    )
                  else
                    Row(
                      children: [
                        if (job.hasApplied == true) ...[
                          Icon(Icons.check_circle, 
                               size: 16, color: Colors.green),
                          SizedBox(width: 4),
                          Text(
                            'Applied',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.green,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ] else ...[
                          Icon(Icons.people, 
                               size: 16, color: Colors.grey),
                          SizedBox(width: 4),
                          Text(
                            job.applicantsText,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ],
                    ),
                  
                  if (isWorkerView && job.hasApplied != true && onApply != null)
                    ElevatedButton(
                      onPressed: onApply,
                      style: ElevatedButton.styleFrom(
                        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: Text('Apply', style: TextStyle(fontSize: 12)),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Color _getUrgencyColor(String urgency) {
    switch (urgency.toLowerCase()) {
      case 'high':
        return Colors.red;
      case 'medium':
        return Colors.orange;
      case 'low':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }
}
```

### 3. Job Creation Form

```dart
class JobCreateForm extends StatefulWidget {
  @override
  _JobCreateFormState createState() => _JobCreateFormState();
}

class _JobCreateFormState extends State<JobCreateForm> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _hourlyRateController = TextEditingController();
  
  Business? selectedBusiness;
  String urgency = 'medium';
  List<String> tags = [];
  DateTime scheduleStart = DateTime.now();
  DateTime scheduleEnd = DateTime.now().add(Duration(hours: 8));
  String recurrence = 'one-time';
  List<String> workDays = [];
  bool verificationRequired = false;
  bool hasOvertime = false;
  double? overtimeRate;
  
  bool isCreating = false;
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Create Job'),
        actions: [
          TextButton(
            onPressed: isCreating ? null : _createJob,
            child: isCreating 
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text('CREATE', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: EdgeInsets.all(16),
          children: [
            // Business Selection (Key for address integration)
            BusinessSelector(
              selectedBusiness: selectedBusiness,
              onBusinessSelected: (business) {
                setState(() {
                  selectedBusiness = business;
                });
              },
            ),
            
            SizedBox(height: 16),
            
            // Job Title
            TextFormField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'Job Title *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.work),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a job title';
                }
                return null;
              },
            ),
            
            SizedBox(height: 16),
            
            // Description
            TextFormField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'Job Description *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.description),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a job description';
                }
                return null;
              },
            ),
            
            SizedBox(height: 16),
            
            // Hourly Rate
            TextFormField(
              controller: _hourlyRateController,
              keyboardType: TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Hourly Rate (\$) *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.attach_money),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter hourly rate';
                }
                final rate = double.tryParse(value);
                if (rate == null || rate <= 0) {
                  return 'Please enter a valid hourly rate';
                }
                return null;
              },
            ),
            
            SizedBox(height: 16),
            
            // Add more form fields as needed...
            
          ],
        ),
      ),
    );
  }
  
  Future<void> _createJob() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    if (selectedBusiness == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select a business location')),
      );
      return;
    }
    
    setState(() {
      isCreating = true;
    });
    
    try {
      final request = JobCreateRequest(
        title: _titleController.text,
        description: _descriptionController.text,
        hourlyRate: double.parse(_hourlyRateController.text),
        urgency: urgency,
        tags: tags,
        scheduleStart: scheduleStart,
        scheduleEnd: scheduleEnd,
        recurrence: recurrence,
        workDays: workDays,
        verificationRequired: verificationRequired,
        hasOvertime: hasOvertime,
        overtimeRate: overtimeRate,
        businessId: selectedBusiness!.id, // This triggers address auto-population
      );
      
      final job = await JobService.createJob(request);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Job created successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      
      Navigator.pop(context, job);
      
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to create job: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        isCreating = false;
      });
    }
  }
  
  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _hourlyRateController.dispose();
    super.dispose();
  }
}
```

---

### 4. Profile Widgets

```dart
class EmployerProfileCard extends StatelessWidget {
  final EmployerProfile profile;
  final VoidCallback? onEdit;
  
  const EmployerProfileCard({
    Key? key,
    required this.profile,
    this.onEdit,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.all(16),
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with profile picture and company logo
            Row(
              children: [
                // Profile Picture (optimized small size for fast loading)
                CircleAvatar(
                  radius: 30,
                  backgroundImage: profile.profilePictureMedium != null
                      ? NetworkImage(profile.profilePictureMedium!)
                      : null,
                  child: profile.profilePictureMedium == null
                      ? Icon(Icons.person, size: 30)
                      : null,
                ),
                SizedBox(width: 16),
                
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.companyName,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (profile.description != null) ...[
                        SizedBox(height: 4),
                        Text(
                          profile.description!,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                
                // Company Logo (optimized for fast loading)
                if (profile.companyLogoSmall != null)
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(8),
                      image: DecorationImage(
                        image: NetworkImage(profile.companyLogoSmall!),
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
              ],
            ),
            
            SizedBox(height: 20),
            
            // Stats
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  icon: Icons.work,
                  label: 'Jobs Posted',
                  value: profile.totalJobsPosted.toString(),
                  color: Colors.blue,
                ),
                _buildStatItem(
                  icon: Icons.people,
                  label: 'Total Hires',
                  value: profile.totalHires.toString(),
                  color: Colors.green,
                ),
                _buildStatItem(
                  icon: Icons.star,
                  label: 'Rating',
                  value: profile.rating.toStringAsFixed(1),
                  color: Colors.orange,
                ),
              ],
            ),
            
            if (onEdit != null) ...[
              SizedBox(height: 20),
              Center(
                child: ElevatedButton.icon(
                  onPressed: onEdit,
                  icon: Icon(Icons.edit),
                  label: Text('Edit Profile'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
  
  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          radius: 25,
          child: Icon(icon, color: color, size: 20),
        ),
        SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}

class WorkerProfileCard extends StatelessWidget {
  final WorkerProfile profile;
  final User user;
  final VoidCallback? onEdit;
  
  const WorkerProfileCard({
    Key? key,
    required this.profile,
    required this.user,
    this.onEdit,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.all(16),
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with profile picture
            Row(
              children: [
                CircleAvatar(
                  radius: 35,
                  backgroundImage: profile.profilePictureMedium != null
                      ? NetworkImage(profile.profilePictureMedium!)
                      : null,
                  child: profile.profilePictureMedium == null
                      ? Icon(Icons.person, size: 35)
                      : null,
                ),
                SizedBox(width: 16),
                
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.fullName,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (profile.bio != null) ...[
                        SizedBox(height: 4),
                        Text(
                          profile.bio!,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            
            SizedBox(height: 20),
            
            // Skills
            if (profile.skills.isNotEmpty) ...[
              Text(
                'Skills',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: profile.skills.take(6).map((skill) {
                  return Container(
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: Text(
                      skill,
                      style: TextStyle(
                        color: Colors.blue.shade700,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
              SizedBox(height: 20),
            ],
            
            // Portfolio thumbnails (optimized for fast loading)
            if (profile.portfolioThumbnails.isNotEmpty) ...[
              Text(
                'Portfolio',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 8),
              Container(
                height: 100,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: profile.portfolioThumbnails.length,
                  itemBuilder: (context, index) {
                    return Container(
                      margin: EdgeInsets.only(right: 8),
                      width: 100,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        image: DecorationImage(
                          image: NetworkImage(profile.portfolioThumbnails[index]),
                          fit: BoxFit.cover,
                        ),
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: () => _showPortfolioImage(
                            context, 
                            profile.portfolioPreviews[index] // Use higher quality for preview
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              SizedBox(height: 20),
            ],
            
            // Stats
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  icon: Icons.work,
                  label: 'Completed',
                  value: profile.completedJobs.toString(),
                  color: Colors.green,
                ),
                _buildStatItem(
                  icon: Icons.star,
                  label: 'Rating',
                  value: profile.rating.toStringAsFixed(1),
                  color: Colors.orange,
                ),
                _buildStatItem(
                  icon: Icons.attach_money,
                  label: 'Earned',
                  value: '\$${profile.totalEarnings.toStringAsFixed(0)}',
                  color: Colors.blue,
                ),
              ],
            ),
            
            if (onEdit != null) ...[
              SizedBox(height: 20),
              Center(
                child: ElevatedButton.icon(
                  onPressed: onEdit,
                  icon: Icon(Icons.edit),
                  label: Text('Edit Profile'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
  
  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          radius: 20,
          child: Icon(icon, color: color, size: 16),
        ),
        SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
  
  void _showPortfolioImage(BuildContext context, String imageUrl) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.9,
            maxHeight: MediaQuery.of(context).size.height * 0.7,
          ),
          child: Image.network(
            imageUrl, // Uses high-quality preview URL
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}
```

---

## 🚨 Error Handling

### 1. API Error Response Model

```dart
class ApiError {
  final String message;
  final int statusCode;
  final String? details;
  
  ApiError({
    required this.message,
    required this.statusCode,
    this.details,
  });
  
  factory ApiError.fromResponse(http.Response response) {
    try {
      final data = jsonDecode(response.body);
      return ApiError(
        message: data['message'] ?? 'Unknown error occurred',
        statusCode: response.statusCode,
        details: data['details']?.toString(),
      );
    } catch (e) {
      return ApiError(
        message: 'Failed to parse error response',
        statusCode: response.statusCode,
        details: response.body,
      );
    }
  }
  
  bool get isAuthError => statusCode == 401;
  bool get isForbiddenError => statusCode == 403;
  bool get isNotFoundError => statusCode == 404;
  bool get isServerError => statusCode >= 500;
}
```

### 2. Error Handling Wrapper

```dart
class ApiResponse<T> {
  final T? data;
  final ApiError? error;
  final bool isLoading;
  
  ApiResponse({this.data, this.error, this.isLoading = false});
  
  factory ApiResponse.loading() => ApiResponse(isLoading: true);
  factory ApiResponse.success(T data) => ApiResponse(data: data);
  factory ApiResponse.error(ApiError error) => ApiResponse(error: error);
  
  bool get hasData => data != null;
  bool get hasError => error != null;
  bool get isSuccess => hasData && !hasError;
}

// Usage in widgets
class JobListWidget extends StatefulWidget {
  @override
  _JobListWidgetState createState() => _JobListWidgetState();
}

class _JobListWidgetState extends State<JobListWidget> {
  ApiResponse<List<Job>> jobsResponse = ApiResponse.loading();
  
  @override
  void initState() {
    super.initState();
    _loadJobs();
  }
  
  Future<void> _loadJobs() async {
    setState(() {
      jobsResponse = ApiResponse.loading();
    });
    
    try {
      final jobs = await JobService.getJobs();
      setState(() {
        jobsResponse = ApiResponse.success(jobs);
      });
    } catch (e) {
      setState(() {
        jobsResponse = ApiResponse.error(ApiError(
          message: e.toString(),
          statusCode: 0,
        ));
      });
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (jobsResponse.isLoading) {
      return Center(child: CircularProgressIndicator());
    }
    
    if (jobsResponse.hasError) {
      return _buildErrorWidget(jobsResponse.error!);
    }
    
    if (jobsResponse.hasData) {
      return _buildJobList(jobsResponse.data!);
    }
    
    return Container();
  }
  
  Widget _buildErrorWidget(ApiError error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error, size: 64, color: Colors.red),
          SizedBox(height: 16),
          Text(
            'Error Loading Jobs',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 8),
          Text(
            error.message,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600]),
          ),
          SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadJobs,
            child: Text('Retry'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildJobList(List<Job> jobs) {
    if (jobs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.work_off, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No Jobs Available',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              'Check back later for new opportunities',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }
    
    return ListView.builder(
      itemCount: jobs.length,
      itemBuilder: (context, index) {
        return JobCard(
          job: jobs[index],
          isWorkerView: true, // or false based on user type
          onTap: () => _viewJobDetails(jobs[index]),
          onApply: () => _applyToJob(jobs[index]),
        );
      },
    );
  }
  
  void _viewJobDetails(Job job) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => JobDetailsScreen(job: job),
      ),
    );
  }
  
  void _applyToJob(Job job) {
    // Implement job application logic
  }
}
```

---

## 🎯 Best Practices

### 1. State Management

```dart
// Using Provider for state management
class JobProvider with ChangeNotifier {
  List<Job> _jobs = [];
  List<Business> _businesses = [];
  bool _isLoading = false;
  String? _errorMessage;
  
  List<Job> get jobs => _jobs;
  List<Business> get businesses => _businesses;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  
  Future<void> loadJobs() async {
    _setLoading(true);
    try {
      _jobs = await JobService.getJobs();
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _setLoading(false);
    }
  }
  
  Future<void> loadBusinesses() async {
    _setLoading(true);
    try {
      _businesses = await JobService.getBusinesses();
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _setLoading(false);
    }
  }
  
  Future<Job> createJob(JobCreateRequest request) async {
    _setLoading(true);
    try {
      final job = await JobService.createJob(request);
      _jobs.insert(0, job); // Add to beginning of list
      _errorMessage = null;
      notifyListeners();
      return job;
    } catch (e) {
      _errorMessage = e.toString();
      throw e;
    } finally {
      _setLoading(false);
    }
  }
  
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
}
```

### 2. Dependency Injection Setup

```dart
// main.dart
void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => JobProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: MyApp(),
    ),
  );
}
```

### 3. Network Configuration

```dart
class NetworkConfig {
  static const String baseUrl = 'http://localhost:3000/api';
  static const Duration requestTimeout = Duration(seconds: 30);
  
  static http.Client get httpClient {
    return http.Client();
  }
  
  static Map<String, String> get defaultHeaders {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
}
```

### 4. Local Storage

```dart
class JobLocalStorage {
  static const String _jobsKey = 'cached_jobs';
  static const String _businessesKey = 'cached_businesses';
  
  static Future<void> cacheJobs(List<Job> jobs) async {
    final prefs = await SharedPreferences.getInstance();
    final jobsJson = jobs.map((job) => job.toJson()).toList();
    await prefs.setString(_jobsKey, jsonEncode(jobsJson));
  }
  
  static Future<List<Job>?> getCachedJobs() async {
    final prefs = await SharedPreferences.getInstance();
    final jobsJsonString = prefs.getString(_jobsKey);
    
    if (jobsJsonString != null) {
      final List<dynamic> jobsJson = jsonDecode(jobsJsonString);
      return jobsJson.map((json) => Job.fromJson(json)).toList();
    }
    
    return null;
  }
  
  static Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_jobsKey);
    await prefs.remove(_businessesKey);
  }
}
```

---

## 📱 Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^0.13.5
  shared_preferences: ^2.0.15
  provider: ^6.0.3
  
dev_dependencies:
  flutter_test:
    sdk: flutter
```

---

## 🚀 Getting Started

1. **Setup Authentication**: Implement login/signup screens using the AuthService
2. **Configure Networking**: Set up your base URL and headers
3. **Implement Job Creation**: Use BusinessSelector for address integration
4. **Add Job Listing**: Display jobs with JobCard widgets
5. **Handle Errors**: Implement proper error handling and user feedback
6. **Test Integration**: Test with your backend API endpoints

## 📞 Support

If you encounter any issues or need clarification on the integration:

1. Check the API endpoints are running correctly
2. Verify authentication tokens are valid
3. Ensure proper error handling is implemented
4. Test network connectivity

---

**Happy Coding! 🎉**