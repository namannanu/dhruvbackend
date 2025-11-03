# 📱 Flutter Integration Guide - Job Creation with Business Address

## 🎯 Overview
This guide shows Flutter developers how to integrate with the job creation and fetching system that automatically handles business address integration.

## 📋 Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Data Models](#data-models) 
3. [API Service Setup](#api-service-setup)
4. [Job Creation Flow](#job-creation-flow)
5. [Job Fetching](#job-fetching)
6. [Code Examples](#code-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

## 🌐 API Endpoints

### Base URL
```dart
const String baseUrl = 'http://your-backend-url.com';
```

### Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/businesses` | Get available businesses | ✅ Yes (Employee) |
| `POST` | `/api/jobs` | Create new job | ✅ Yes (Employee) |
| `GET` | `/api/jobs` | Get jobs list | ✅ Yes (Employee/Worker) |
| `GET` | `/api/jobs/:id` | Get specific job | ✅ Yes |

## 📊 Data Models

### Business Model
```dart
class Business {
  final String id;
  final String name;
  final String? description;
  final String? type;
  final String? phone;
  final String? email;
  final BusinessLocation? location;
  final bool isActive;
  final BusinessStats? stats;

  Business({
    required this.id,
    required this.name,
    this.description,
    this.type,
    this.phone,
    this.email,
    this.location,
    this.isActive = true,
    this.stats,
  });

  factory Business.fromJson(Map<String, dynamic> json) {
    return Business(
      id: json['_id'] ?? json['id'],
      name: json['name'],
      description: json['description'],
      type: json['type'],
      phone: json['phone'],
      email: json['email'],
      location: json['location'] != null 
        ? BusinessLocation.fromJson(json['location']) 
        : null,
      isActive: json['isActive'] ?? true,
      stats: json['stats'] != null 
        ? BusinessStats.fromJson(json['stats']) 
        : null,
    );
  }
}

class BusinessLocation {
  final String? line1;
  final String? line2;
  final String? city;
  final String? state;
  final String? postalCode;
  final String? country;
  final double? latitude;
  final double? longitude;

  BusinessLocation({
    this.line1,
    this.line2,
    this.city,
    this.state,
    this.postalCode,
    this.country,
    this.latitude,
    this.longitude,
  });

  factory BusinessLocation.fromJson(Map<String, dynamic> json) {
    return BusinessLocation(
      line1: json['line1'],
      line2: json['line2'],
      city: json['city'],
      state: json['state'],
      postalCode: json['postalCode'],
      country: json['country'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
    );
  }

  String get formattedAddress {
    List<String> parts = [];
    if (line1?.isNotEmpty == true) parts.add(line1!);
    if (line2?.isNotEmpty == true) parts.add(line2!);
    if (city?.isNotEmpty == true) parts.add(city!);
    if (state?.isNotEmpty == true) parts.add(state!);
    if (postalCode?.isNotEmpty == true) parts.add(postalCode!);
    return parts.join(', ');
  }
}

class BusinessStats {
  final int jobsPosted;
  final int hires;

  BusinessStats({
    required this.jobsPosted,
    required this.hires,
  });

  factory BusinessStats.fromJson(Map<String, dynamic> json) {
    return BusinessStats(
      jobsPosted: json['jobsPosted'] ?? 0,
      hires: json['hires'] ?? 0,
    );
  }
}
```

### Job Model (Enhanced with Address Integration)
```dart
class JobPosting {
  final String id;
  final String title;
  final String description;
  final double hourlyRate;
  final String urgency;
  final List<String> tags;
  final String status;
  final DateTime? scheduleStart;
  final DateTime? scheduleEnd;
  final String? recurrence;
  final List<String>? workDays;
  final bool verificationRequired;
  final bool premiumRequired;
  final int applicantsCount;
  
  // 🎯 Business Address Fields (Auto-populated by backend)
  final String? businessId;
  final String businessName;        // ← Auto-filled from business
  final String businessAddress;     // ← Auto-filled from business
  final String locationSummary;     // ← Auto-filled from business
  final String? businessLogoUrl;    // ← Auto-filled from business
  final String? businessLogoSquareUrl;
  final String? businessLogoOriginalUrl;
  
  // 🗺️ Enhanced Location Object
  final JobLocation? location;
  
  // 👷 Worker-specific fields
  final bool? hasApplied;
  final double? distanceMiles;
  
  JobPosting({
    required this.id,
    required this.title,
    required this.description,
    required this.hourlyRate,
    required this.urgency,
    required this.tags,
    required this.status,
    this.scheduleStart,
    this.scheduleEnd,
    this.recurrence,
    this.workDays,
    required this.verificationRequired,
    required this.premiumRequired,
    required this.applicantsCount,
    this.businessId,
    required this.businessName,
    required this.businessAddress,
    required this.locationSummary,
    this.businessLogoUrl,
    this.businessLogoSquareUrl,
    this.businessLogoOriginalUrl,
    this.location,
    this.hasApplied,
    this.distanceMiles,
  });

  factory JobPosting.fromJson(Map<String, dynamic> json) {
    return JobPosting(
      id: json['_id'] ?? json['id'],
      title: json['title'],
      description: json['description'],
      hourlyRate: (json['hourlyRate'] ?? 0).toDouble(),
      urgency: json['urgency'] ?? 'low',
      tags: List<String>.from(json['tags'] ?? []),
      status: json['status'] ?? 'active',
      scheduleStart: json['scheduleStart'] != null 
        ? DateTime.parse(json['scheduleStart']) 
        : null,
      scheduleEnd: json['scheduleEnd'] != null 
        ? DateTime.parse(json['scheduleEnd']) 
        : null,
      recurrence: json['recurrence'],
      workDays: json['workDays'] != null 
        ? List<String>.from(json['workDays']) 
        : null,
      verificationRequired: json['verificationRequired'] ?? false,
      premiumRequired: json['premiumRequired'] ?? false,
      applicantsCount: json['applicantsCount'] ?? 0,
      
      // 🎯 Business address fields (auto-populated by backend)
      businessId: json['businessId'] ?? json['business'],
      businessName: json['businessName'] ?? '',
      businessAddress: json['businessAddress'] ?? '',
      locationSummary: json['locationSummary'] ?? '',
      businessLogoUrl: json['businessLogoUrl'],
      businessLogoSquareUrl: json['businessLogoSquareUrl'],
      businessLogoOriginalUrl: json['businessLogoOriginalUrl'],
      
      // Enhanced location
      location: json['location'] != null 
        ? JobLocation.fromJson(json['location']) 
        : null,
        
      // Worker-specific fields
      hasApplied: json['hasApplied'],
      distanceMiles: json['distanceMiles']?.toDouble(),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'hourlyRate': hourlyRate,
      'urgency': urgency,
      'tags': tags,
      'status': status,
      'scheduleStart': scheduleStart?.toIso8601String(),
      'scheduleEnd': scheduleEnd?.toIso8601String(),
      'recurrence': recurrence,
      'workDays': workDays,
      'verificationRequired': verificationRequired,
      'premiumRequired': premiumRequired,
      'applicantsCount': applicantsCount,
      'businessId': businessId,
      'businessName': businessName,
      'businessAddress': businessAddress,
      'locationSummary': locationSummary,
      'businessLogoUrl': businessLogoUrl,
      'businessLogoSquareUrl': businessLogoSquareUrl,
      'businessLogoOriginalUrl': businessLogoOriginalUrl,
      'location': location?.toJson(),
      'hasApplied': hasApplied,
      'distanceMiles': distanceMiles,
    };
  }
}

class JobLocation {
  final String? line1;
  final String? city;
  final String? state;
  final String? postalCode;
  final String? country;
  final double? latitude;
  final double? longitude;
  final String? formattedAddress;  // "123 Main St, City, State 12345"
  final String? shortAddress;      // "City, State"
  final String? fullAddress;       // Complete address
  final String? label;             // Business name

  JobLocation({
    this.line1,
    this.city,
    this.state,
    this.postalCode,
    this.country,
    this.latitude,
    this.longitude,
    this.formattedAddress,
    this.shortAddress,
    this.fullAddress,
    this.label,
  });

  factory JobLocation.fromJson(Map<String, dynamic> json) {
    return JobLocation(
      line1: json['line1'],
      city: json['city'],
      state: json['state'],
      postalCode: json['postalCode'],
      country: json['country'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      formattedAddress: json['formattedAddress'],
      shortAddress: json['shortAddress'],
      fullAddress: json['fullAddress'],
      label: json['label'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'line1': line1,
      'city': city,
      'state': state,
      'postalCode': postalCode,
      'country': country,
      'latitude': latitude,
      'longitude': longitude,
      'formattedAddress': formattedAddress,
      'shortAddress': shortAddress,
      'fullAddress': fullAddress,
      'label': label,
    };
  }
}
```

### Job Creation Request Model
```dart
class CreateJobRequest {
  final String businessId;         // ← REQUIRED: Backend fetches address from this
  final String title;
  final String description;
  final double hourlyRate;
  final String? urgency;
  final List<String>? tags;
  final String? scheduleStart;     // ISO 8601 format
  final String? scheduleEnd;       // ISO 8601 format
  final String? recurrence;
  final List<String>? workDays;
  final bool? verificationRequired;
  final bool? hasOvertime;
  final double? overtimeRate;
  final String? customAddress;     // Optional: Override business address

  CreateJobRequest({
    required this.businessId,
    required this.title,
    required this.description,
    required this.hourlyRate,
    this.urgency,
    this.tags,
    this.scheduleStart,
    this.scheduleEnd,
    this.recurrence,
    this.workDays,
    this.verificationRequired,
    this.hasOvertime,
    this.overtimeRate,
    this.customAddress,
  });

  Map<String, dynamic> toJson() {
    return {
      'businessId': businessId,
      'title': title,
      'description': description,
      'hourlyRate': hourlyRate,
      if (urgency != null) 'urgency': urgency,
      if (tags != null) 'tags': tags,
      if (scheduleStart != null) 'scheduleStart': scheduleStart,
      if (scheduleEnd != null) 'scheduleEnd': scheduleEnd,
      if (recurrence != null) 'recurrence': recurrence,
      if (workDays != null) 'workDays': workDays,
      if (verificationRequired != null) 'verificationRequired': verificationRequired,
      if (hasOvertime != null) 'hasOvertime': hasOvertime,
      if (overtimeRate != null) 'overtimeRate': overtimeRate,
      if (customAddress != null) 'customAddress': customAddress,
    };
  }
}
```

## 🔧 API Service Setup

### HTTP Client Setup
```dart
import 'package:dio/dio.dart';

class ApiService {
  late final Dio _dio;
  final String baseUrl;
  String? _authToken;

  ApiService({required this.baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptors
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          // Add auth token if available
          if (_authToken != null) {
            options.headers['Authorization'] = 'Bearer $_authToken';
          }
          
          print('🌐 ${options.method} ${options.path}');
          if (options.data != null) {
            print('📦 Request data: ${options.data}');
          }
          
          handler.next(options);
        },
        onResponse: (response, handler) {
          print('✅ Response: ${response.statusCode}');
          handler.next(response);
        },
        onError: (error, handler) {
          print('❌ API Error: ${error.message}');
          if (error.response != null) {
            print('   Status: ${error.response!.statusCode}');
            print('   Data: ${error.response!.data}');
          }
          handler.next(error);
        },
      ),
    );
  }

  void setAuthToken(String token) {
    _authToken = token;
  }

  void clearAuthToken() {
    _authToken = null;
  }
}
```

### Job Service Implementation
```dart
class JobService {
  final ApiService _apiService;

  JobService(this._apiService);

  // 🏢 Get available businesses for job creation
  Future<List<Business>> getAvailableBusinesses() async {
    try {
      final response = await _apiService._dio.get('/api/businesses');
      
      // Handle different response formats
      final data = response.data['data'] ?? response.data;
      
      if (data is List) {
        return data.map((json) => Business.fromJson(json)).toList();
      } else {
        throw Exception('Expected businesses list, got: ${data.runtimeType}');
      }
    } on DioException catch (e) {
      throw _handleApiError(e);
    }
  }

  // 🚀 Create job with business address integration
  Future<JobPosting> createJob(CreateJobRequest request) async {
    try {
      final response = await _apiService._dio.post(
        '/api/jobs',
        data: request.toJson(),
      );
      
      final data = response.data['data'] ?? response.data;
      return JobPosting.fromJson(data);
    } on DioException catch (e) {
      throw _handleApiError(e);
    }
  }

  // 📋 Get jobs (filtered by user type automatically by backend)
  Future<List<JobPosting>> getJobs({
    String? status,
    String? urgency,
    String? businessId,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      
      if (status != null) queryParams['status'] = status;
      if (urgency != null) queryParams['urgency'] = urgency;
      if (businessId != null) queryParams['businessId'] = businessId;

      final response = await _apiService._dio.get(
        '/api/jobs',
        queryParameters: queryParams,
      );
      
      final data = response.data['data'] ?? response.data;
      
      if (data is List) {
        return data.map((json) => JobPosting.fromJson(json)).toList();
      } else {
        throw Exception('Expected jobs list, got: ${data.runtimeType}');
      }
    } on DioException catch (e) {
      throw _handleApiError(e);
    }
  }

  // 📄 Get specific job
  Future<JobPosting> getJob(String jobId) async {
    try {
      final response = await _apiService._dio.get('/api/jobs/$jobId');
      
      final data = response.data['data'] ?? response.data;
      return JobPosting.fromJson(data);
    } on DioException catch (e) {
      throw _handleApiError(e);
    }
  }

  // ❌ Error handling
  Exception _handleApiError(DioException e) {
    if (e.response != null) {
      final statusCode = e.response!.statusCode;
      final message = e.response!.data?['message'] ?? 'Unknown error';
      
      switch (statusCode) {
        case 400:
          return ValidationException(message);
        case 401:
          return AuthenticationException(message);
        case 403:
          return AuthorizationException(message);
        case 404:
          return NotFoundException(message);
        case 500:
          return ServerException(message);
        default:
          return ApiException('API Error ($statusCode): $message');
      }
    } else {
      return NetworkException('Network error: ${e.message}');
    }
  }
}

// Custom exceptions
class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class ValidationException extends ApiException {
  ValidationException(super.message);
}

class AuthenticationException extends ApiException {
  AuthenticationException(super.message);
}

class AuthorizationException extends ApiException {
  AuthorizationException(super.message);
}

class NotFoundException extends ApiException {
  NotFoundException(super.message);
}

class ServerException extends ApiException {
  ServerException(super.message);
}

class NetworkException extends ApiException {
  NetworkException(super.message);
}
```

## 🏗️ Job Creation Flow

### Step 1: Business Selection Widget
```dart
class BusinessSelectionWidget extends StatefulWidget {
  final Function(Business) onBusinessSelected;
  
  const BusinessSelectionWidget({
    Key? key,
    required this.onBusinessSelected,
  }) : super(key: key);

  @override
  State<BusinessSelectionWidget> createState() => _BusinessSelectionWidgetState();
}

class _BusinessSelectionWidgetState extends State<BusinessSelectionWidget> {
  List<Business> _businesses = [];
  Business? _selectedBusiness;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBusinesses();
  }

  Future<void> _loadBusinesses() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final jobService = context.read<JobService>();
      final businesses = await jobService.getAvailableBusinesses();
      
      setState(() {
        _businesses = businesses;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
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
            const Row(
              children: [
                Text(
                  'Which business is hiring?',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                Text(' *', style: TextStyle(color: Colors.red, fontSize: 16)),
              ],
            ),
            const SizedBox(height: 12),
            
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_error != null)
              Column(
                children: [
                  Text(
                    'Error loading businesses: $_error',
                    style: const TextStyle(color: Colors.red),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: _loadBusinesses,
                    child: const Text('Retry'),
                  ),
                ],
              )
            else if (_businesses.isEmpty)
              const Text(
                'No businesses found. Please add a business first.',
                style: TextStyle(color: Colors.orange),
              )
            else
              DropdownButtonFormField<Business>(
                value: _selectedBusiness,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  labelText: 'Select Business',
                  hintText: 'Choose a business location',
                ),
                items: _businesses.map((business) {
                  return DropdownMenuItem<Business>(
                    value: business,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          business.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (business.location?.formattedAddress.isNotEmpty == true)
                          Text(
                            business.location!.formattedAddress,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (Business? business) {
                  setState(() {
                    _selectedBusiness = business;
                  });
                  if (business != null) {
                    widget.onBusinessSelected(business);
                  }
                },
                validator: (value) {
                  if (value == null) {
                    return 'Please select a business';
                  }
                  return null;
                },
              ),
              
            // Show selected business address preview
            if (_selectedBusiness?.location != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '📍 Job Location (Auto-filled)',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.blue,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _selectedBusiness!.location!.formattedAddress,
                      style: const TextStyle(fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'This address will be automatically used for the job posting.',
                      style: TextStyle(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

### Step 2: Job Creation Screen
```dart
class JobCreationScreen extends StatefulWidget {
  const JobCreationScreen({Key? key}) : super(key: key);

  @override
  State<JobCreationScreen> createState() => _JobCreationScreenState();
}

class _JobCreationScreenState extends State<JobCreationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _hourlyRateController = TextEditingController();
  
  Business? _selectedBusiness;
  String _urgency = 'medium';
  List<String> _tags = [];
  DateTime? _startDate;
  DateTime? _endDate;
  String _recurrence = 'once';
  List<String> _workDays = [];
  bool _verificationRequired = false;
  bool _hasOvertime = false;
  double? _overtimeRate;
  
  bool _creating = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Job'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Business Selection (with auto address integration)
            BusinessSelectionWidget(
              onBusinessSelected: (business) {
                setState(() {
                  _selectedBusiness = business;
                });
              },
            ),
            
            const SizedBox(height: 16),
            
            // Job Details
            _buildJobDetailsCard(),
            
            const SizedBox(height: 16),
            
            // Schedule
            _buildScheduleCard(),
            
            const SizedBox(height: 16),
            
            // Pay & Benefits
            _buildPayCard(),
            
            const SizedBox(height: 32),
            
            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _creating ? null : _createJob,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
                child: _creating
                  ? const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(width: 12),
                        Text('Creating Job...'),
                      ],
                    )
                  : const Text(
                      'Create Job',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildJobDetailsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Job Details',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Job Title *',
                border: OutlineInputBorder(),
                hintText: 'e.g., Restaurant Server',
              ),
              validator: (value) {
                if (value?.trim().isEmpty ?? true) {
                  return 'Job title is required';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Job Description *',
                border: OutlineInputBorder(),
                hintText: 'Describe the job responsibilities...',
              ),
              maxLines: 4,
              validator: (value) {
                if (value?.trim().isEmpty ?? true) {
                  return 'Job description is required';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            // Urgency Selection
            const Text(
              'Urgency Level',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: RadioListTile<String>(
                    title: const Text('Normal'),
                    subtitle: const Text('Standard timeline'),
                    value: 'medium',
                    groupValue: _urgency,
                    onChanged: (value) {
                      setState(() {
                        _urgency = value!;
                      });
                    },
                  ),
                ),
                Expanded(
                  child: RadioListTile<String>(
                    title: const Text('Urgent'),
                    subtitle: const Text('ASAP'),
                    value: 'high',
                    groupValue: _urgency,
                    onChanged: (value) {
                      setState(() {
                        _urgency = value!;
                      });
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduleCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Schedule',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            
            // Date/Time selection widgets here
            // Implementation similar to your existing Flutter code
            
          ],
        ),
      ),
    );
  }

  Widget _buildPayCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Pay & Benefits',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _hourlyRateController,
              decoration: const InputDecoration(
                labelText: 'Hourly Rate *',
                border: OutlineInputBorder(),
                prefixText: '\$ ',
                hintText: '15.00',
              ),
              keyboardType: TextInputType.number,
              validator: (value) {
                if (value?.trim().isEmpty ?? true) {
                  return 'Hourly rate is required';
                }
                final rate = double.tryParse(value!);
                if (rate == null || rate <= 0) {
                  return 'Enter a valid hourly rate';
                }
                return null;
              },
            ),
            
            const SizedBox(height: 16),
            
            SwitchListTile(
              title: const Text('Overtime Available'),
              subtitle: const Text('Offer overtime pay for extra hours'),
              value: _hasOvertime,
              onChanged: (value) {
                setState(() {
                  _hasOvertime = value;
                });
              },
            ),
            
            if (_hasOvertime) ...[
              const SizedBox(height: 12),
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Overtime Rate (per hour)',
                  border: OutlineInputBorder(),
                  prefixText: '\$ ',
                  hintText: '22.50',
                ),
                keyboardType: TextInputType.number,
                onChanged: (value) {
                  _overtimeRate = double.tryParse(value);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _createJob() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedBusiness == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a business first'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _creating = true;
    });

    try {
      final request = CreateJobRequest(
        businessId: _selectedBusiness!.id,  // 🎯 Backend fetches address from this
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        hourlyRate: double.parse(_hourlyRateController.text.trim()),
        urgency: _urgency,
        tags: _tags,
        scheduleStart: _startDate?.toIso8601String(),
        scheduleEnd: _endDate?.toIso8601String(),
        recurrence: _recurrence,
        workDays: _workDays.isNotEmpty ? _workDays : null,
        verificationRequired: _verificationRequired,
        hasOvertime: _hasOvertime,
        overtimeRate: _overtimeRate,
      );

      final jobService = context.read<JobService>();
      final createdJob = await jobService.createJob(request);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Job "${createdJob.title}" created successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        
        Navigator.of(context).pop(true); // Return success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create job: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _creating = false;
        });
      }
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

## 📋 Job Fetching

### Job List Widget
```dart
class JobListWidget extends StatefulWidget {
  final UserType userType;
  
  const JobListWidget({
    Key? key,
    required this.userType,
  }) : super(key: key);

  @override
  State<JobListWidget> createState() => _JobListWidgetState();
}

class _JobListWidgetState extends State<JobListWidget> {
  List<JobPosting> _jobs = [];
  bool _loading = false;
  String? _error;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    _loadJobs();
  }

  Future<void> _loadJobs() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final jobService = context.read<JobService>();
      final jobs = await jobService.getJobs(
        status: _statusFilter,
      );
      
      setState(() {
        _jobs = jobs;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Filter buttons
        if (widget.userType == UserType.worker)
          _buildWorkerFilters(),
        
        if (widget.userType == UserType.employer)
          _buildEmployerFilters(),
        
        const SizedBox(height: 16),
        
        // Job list
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_error != null)
          _buildErrorWidget()
        else if (_jobs.isEmpty)
          _buildEmptyWidget()
        else
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadJobs,
              child: ListView.builder(
                itemCount: _jobs.length,
                itemBuilder: (context, index) {
                  final job = _jobs[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: JobCard(
                      job: job,
                      userType: widget.userType,
                      onTap: () => _openJobDetails(job),
                    ),
                  );
                },
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildWorkerFilters() {
    return Row(
      children: [
        Expanded(
          child: FilterChip(
            label: const Text('Available'),
            selected: _statusFilter == 'active',
            onSelected: (selected) {
              setState(() {
                _statusFilter = selected ? 'active' : null;
              });
              _loadJobs();
            },
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: FilterChip(
            label: const Text('Applied'),
            selected: _statusFilter == 'applied', // Custom filter
            onSelected: (selected) {
              setState(() {
                _statusFilter = selected ? 'applied' : null;
              });
              _loadJobs();
            },
          ),
        ),
      ],
    );
  }

  Widget _buildEmployerFilters() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          FilterChip(
            label: const Text('All'),
            selected: _statusFilter == null,
            onSelected: (selected) {
              setState(() {
                _statusFilter = null;
              });
              _loadJobs();
            },
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Active'),
            selected: _statusFilter == 'active',
            onSelected: (selected) {
              setState(() {
                _statusFilter = selected ? 'active' : null;
              });
              _loadJobs();
            },
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Closed'),
            selected: _statusFilter == 'closed',
            onSelected: (selected) {
              setState(() {
                _statusFilter = selected ? 'closed' : null;
              });
              _loadJobs();
            },
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Filled'),
            selected: _statusFilter == 'filled',
            onSelected: (selected) {
              setState(() {
                _statusFilter = selected ? 'filled' : null;
              });
              _loadJobs();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red,
          ),
          const SizedBox(height: 16),
          Text(
            'Error loading jobs',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(_error!),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadJobs,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            widget.userType == UserType.worker 
              ? Icons.work_off_outlined 
              : Icons.work_outline,
            size: 64,
            color: Colors.grey,
          ),
          const SizedBox(height: 16),
          Text(
            widget.userType == UserType.worker 
              ? 'No jobs available'
              : 'No jobs posted yet',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            widget.userType == UserType.worker
              ? 'Check back later for new opportunities'
              : 'Create your first job posting to get started',
          ),
        ],
      ),
    );
  }

  void _openJobDetails(JobPosting job) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => JobDetailsScreen(job: job),
      ),
    );
  }
}

enum UserType { employer, worker }
```

### Job Card Widget (Enhanced with Address)
```dart
class JobCard extends StatelessWidget {
  final JobPosting job;
  final UserType userType;
  final VoidCallback? onTap;
  final VoidCallback? onApply;

  const JobCard({
    Key? key,
    required this.job,
    required this.userType,
    this.onTap,
    this.onApply,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with business info
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Business logo (if available)
                  if (job.businessLogoSquareUrl?.isNotEmpty == true)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        job.businessLogoSquareUrl!,
                        width: 40,
                        height: 40,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return _buildDefaultLogo();
                        },
                      ),
                    )
                  else
                    _buildDefaultLogo(),
                  
                  const SizedBox(width: 12),
                  
                  // Job title and business info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          job.title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        
                        if (job.businessName.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            job.businessName,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                        
                        // 🎯 Business Address (Auto-populated)
                        if (job.businessAddress.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(
                                Icons.location_on_outlined,
                                size: 14,
                                color: Colors.grey[600],
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  job.businessAddress,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[600],
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  
                  // Status badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor(job.status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _getStatusColor(job.status),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      job.status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: _getStatusColor(job.status),
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Job details
              Column(
                children: [
                  _buildDetailRow(
                    Icons.attach_money,
                    'Hourly Rate',
                    '\$${job.hourlyRate.toStringAsFixed(2)}/hr',
                  ),
                  
                  if (job.urgency != 'low')
                    _buildDetailRow(
                      Icons.priority_high,
                      'Urgency',
                      job.urgency.toUpperCase(),
                      valueColor: job.urgency == 'high' ? Colors.red : Colors.orange,
                    ),
                  
                  if (userType == UserType.worker && job.distanceMiles != null)
                    _buildDetailRow(
                      Icons.directions,
                      'Distance',
                      '${job.distanceMiles!.toStringAsFixed(1)} miles',
                    ),
                  
                  if (job.applicantsCount > 0)
                    _buildDetailRow(
                      Icons.people_outline,
                      'Applicants',
                      '${job.applicantsCount} applied',
                    ),
                  
                  if (job.scheduleStart != null)
                    _buildDetailRow(
                      Icons.schedule,
                      'Schedule',
                      _formatSchedule(job.scheduleStart!, job.scheduleEnd),
                    ),
                ],
              ),
              
              // Description preview
              if (job.description.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  job.description,
                  style: const TextStyle(fontSize: 14),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              
              // Tags
              if (job.tags.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: job.tags.take(3).map((tag) {
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        tag,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.blue.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
              
              // Action buttons for workers
              if (userType == UserType.worker && job.status == 'active') ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: job.hasApplied == true ? null : onApply,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: job.hasApplied == true 
                        ? Colors.grey 
                        : Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                    child: Text(
                      job.hasApplied == true 
                        ? 'Applied ✓' 
                        : 'Apply Now',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDefaultLogo() {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.blue.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(
        Icons.business,
        color: Colors.blue.shade700,
        size: 20,
      ),
    );
  }

  Widget _buildDetailRow(
    IconData icon,
    String label,
    String value, {
    Color? valueColor,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(
            icon,
            size: 16,
            color: Colors.grey[600],
          ),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[700],
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              color: valueColor ?? Colors.black87,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return Colors.green;
      case 'closed':
        return Colors.red;
      case 'filled':
        return Colors.blue;
      case 'draft':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _formatSchedule(DateTime start, DateTime? end) {
    if (end == null) {
      return DateFormat('MMM d, y').format(start);
    }
    
    if (start.day == end.day && start.month == end.month && start.year == end.year) {
      return '${DateFormat('MMM d').format(start)} • ${DateFormat('HH:mm').format(start)}-${DateFormat('HH:mm').format(end)}';
    }
    
    return '${DateFormat('MMM d').format(start)} - ${DateFormat('MMM d').format(end)}';
  }
}
```

## 🎯 Key Points for Flutter Developers

### 1. **Automatic Address Integration**
- ✅ **No manual address entry required** when creating jobs
- ✅ Just select `businessId` - backend fetches all address data automatically
- ✅ Response includes multiple address formats for different UI needs

### 2. **Address Fields Available**
```dart
// Always available in job responses:
job.businessAddress      // "123 Main St, City, State 12345"
job.businessName         // "Restaurant Name"
job.locationSummary      // "City, State"

// Enhanced location object:
job.location.formattedAddress  // Full formatted address
job.location.shortAddress      // Short "City, State" format
job.location.latitude          // Coordinates for maps
job.location.longitude         // Coordinates for maps
job.location.label             // Business name for map markers
```

### 3. **Worker-Specific Features**
```dart
// Automatically calculated for workers:
job.hasApplied          // true/false - has this worker applied?
job.distanceMiles       // 2.5 - distance from worker location
job.premiumRequired     // true/false - requires premium to apply?
```

### 4. **Error Handling**
```dart
try {
  final jobs = await jobService.getJobs();
} on ValidationException catch (e) {
  // Handle validation errors (400)
} on AuthenticationException catch (e) {
  // Handle auth errors (401) - redirect to login
} on AuthorizationException catch (e) {
  // Handle permission errors (403)
} on NotFoundException catch (e) {
  // Handle not found errors (404)
} on ServerException catch (e) {
  // Handle server errors (500)
} on NetworkException catch (e) {
  // Handle network errors
}
```

### 5. **Best Practices**

#### Cache Business List
```dart
class BusinessService {
  List<Business>? _cachedBusinesses;
  DateTime? _lastFetch;

  Future<List<Business>> getBusinesses() async {
    if (_cachedBusinesses != null && 
        _lastFetch != null && 
        DateTime.now().difference(_lastFetch!).inMinutes < 30) {
      return _cachedBusinesses!;
    }
    
    _cachedBusinesses = await _fetchBusinessesFromApi();
    _lastFetch = DateTime.now();
    return _cachedBusinesses!;
  }
}
```

#### Implement Pull-to-Refresh
```dart
RefreshIndicator(
  onRefresh: () async {
    await jobService.getJobs();
    setState(() {}); // Rebuild UI
  },
  child: ListView(...)
)
```

#### Handle Loading States
```dart
class JobListState {
  final bool isLoading;
  final List<JobPosting> jobs;
  final String? error;
  
  const JobListState({
    this.isLoading = false,
    this.jobs = const [],
    this.error,
  });
}
```

## 🚀 Ready to Use!

Your Flutter app can now:
1. ✅ **Fetch businesses** and let employees select one
2. ✅ **Create jobs** with automatic address integration
3. ✅ **Fetch jobs** for both employees and workers
4. ✅ **Display address information** in a user-friendly format
5. ✅ **Handle errors** gracefully with proper user feedback

The backend automatically handles all address fetching and formatting - your Flutter app just needs to use the provided fields! 🎉