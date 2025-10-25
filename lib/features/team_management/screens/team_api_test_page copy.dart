// ignore_for_file: use_build_context_synchronously, avoid_print, file_names
/*
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';

// Simple HTTP client implementation for this standalone file
class SimpleHttpClient {
  static Future<SimpleHttpResponse> get(
    Uri url, {
    Map<String, String>? headers,
  }) async {
    final client = HttpClient();
    try {
      final request = await client.getUrl(url);
      headers?.forEach((key, value) => request.headers.set(key, value));

      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      return SimpleHttpResponse(
        statusCode: response.statusCode,
        body: body,
        headers: <String, String>{},
      );
    } finally {
      client.close();
    }
  }

  static Future<SimpleHttpResponse> post(
    Uri url, {
    Map<String, String>? headers,
    String? body,
  }) async {
    final client = HttpClient();
    try {
      final request = await client.postUrl(url);
      headers?.forEach((key, value) => request.headers.set(key, value));

      if (body != null) {
        request.write(body);
      }

      final response = await request.close();
      final responseBody = await response.transform(utf8.decoder).join();

      return SimpleHttpResponse(
        statusCode: response.statusCode,
        body: responseBody,
        headers: <String, String>{},
      );
    } finally {
      client.close();
    }
  }
}

class SimpleHttpResponse {
  final int statusCode;
  final String body;
  final Map<String, String> headers;

  SimpleHttpResponse({
    required this.statusCode,
    required this.body,
    required this.headers,
  });
}

// Mock DirectTeamTestService for this standalone file
class DirectTeamTestService {
  static Future<void> testTeamInvitation({
    required String authToken,
    required String email,
    required String businessId,
    required String role,
    required String accessLevel,
  }) async {
    final url = Uri.parse('https://dhruvbackend.vercel.app/api/team/invite');
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $authToken',
    };
    final body = json.encode({
      'email': email,
      'businessId': businessId,
      'role': role,
      'accessLevel': accessLevel,
    });

    final response = await SimpleHttpClient.post(
      url,
      headers: headers,
      body: body,
    );
    print('Invitation Response: ${response.statusCode} - ${response.body}');
  }

  static Future<void> checkUserAccess(String authToken) async {
    final url = Uri.parse(
      'https://dhruvbackend.vercel.app/api/team/check-access',
    );
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $authToken',
    };

    final response = await SimpleHttpClient.get(url, headers: headers);
    print('Access Check Response: ${response.statusCode} - ${response.body}');
  }
}

void main() {
  runApp(const TeamApiTestApp());
}

class TeamApiTestApp extends StatelessWidget {
  const TeamApiTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Team API Test',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const TeamApiTestPage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class TeamApiTestPage extends StatefulWidget {
  const TeamApiTestPage({super.key});

  @override
  State<TeamApiTestPage> createState() => _TeamApiTestPageState();
}

class _TeamApiTestPageState extends State<TeamApiTestPage> {
  final TextEditingController _authTokenController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _businessIdController = TextEditingController();

  String _selectedRole = 'staff';
  String _selectedAccessLevel = 'view_only';
  bool _isLoading = false;

  Map<String, dynamic>? _teamData;
  List<Map<String, dynamic>> _members = [];
  String? _requestUrl;
  Map<String, String>? _requestHeaders;
  int? _responseStatus;
  Map<String, String>? _responseHeaders;
  String? _responseBodyPretty;
  String? _fetchError;

  @override
  void initState() {
    super.initState();
    _businessIdController.text = '68e8d6caaf91efc4cf7f223e';
    _emailController.text = 'j@gmail.com';
  }

  @override
  void dispose() {
    _authTokenController.dispose();
    _emailController.dispose();
    _businessIdController.dispose();
    super.dispose();
  }

  Future<void> _testInvitation() async {
    final authToken = _authTokenController.text.trim();
    final email = _emailController.text.trim();
    final businessId = _businessIdController.text.trim();

    if (authToken.isEmpty || email.isEmpty || businessId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill in all required fields'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      await DirectTeamTestService.testTeamInvitation(
        authToken: authToken,
        email: email,
        businessId: businessId,
        role: _selectedRole,
        accessLevel: _selectedAccessLevel,
      );

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invitation request sent. Check console for details.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Test failed: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _testGetTeamMembers({bool showStatus = true}) async {
    final authToken = _authTokenController.text.trim();

    if (authToken.isEmpty) {
      if (showStatus) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter auth token first'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    if (showStatus) {
      setState(() => _isLoading = true);
    }

    try {
      final url = Uri.parse('https://dhruvbackend.vercel.app/api/team/my-team');
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $authToken',
      };

      final response = await SimpleHttpClient.get(url, headers: headers);
      dynamic decodedBody;
      try {
        decodedBody = json.decode(response.body);
      } catch (_) {
        decodedBody = null;
      }

      Map<String, dynamic>? teamData;
      final members = <Map<String, dynamic>>[];

      if (decodedBody is Map<String, dynamic>) {
        teamData = decodedBody;

        final data = decodedBody['data'];
        if (data is List) {
          for (final member in data) {
            if (member is Map) {
              members.add(member.cast<String, dynamic>());
            }
          }
        }
      } else if (decodedBody is List) {
        for (final member in decodedBody) {
          if (member is Map) {
            members.add(member.cast<String, dynamic>());
          }
        }
        teamData = {
          'status': response.statusCode == 200 ? 'success' : 'error',
          'count': members.length,
          'data': members,
        };
      }

      final prettyBody = _prettyPrintJson(decodedBody ?? response.body);

      if (mounted) {
        setState(() {
          _teamData = teamData;
          _members = members;
          _fetchError = response.statusCode == 200
              ? null
              : 'Request failed with status ${response.statusCode}.';
          _requestUrl = url.toString();
          _requestHeaders = Map<String, String>.from(headers);
          _responseStatus = response.statusCode;
          _responseHeaders = Map<String, String>.from(response.headers);
          _responseBodyPretty = prettyBody;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _fetchError = 'Failed to fetch team members: $e';
          _teamData = null;
          _members = [];
        });
      }
    } finally {
      if (mounted && showStatus) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _testCheckAccess() async {
    final authToken = _authTokenController.text.trim();

    if (authToken.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter auth token first'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      await DirectTeamTestService.checkUserAccess(authToken);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Access check completed. Check console output.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Access check failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Team API Sandbox'),
        actions: [
          IconButton(
            tooltip: 'Refresh members (no loader)',
            onPressed: () => _testGetTeamMembers(showStatus: false),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Request Setup',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _authTokenController,
                      decoration: const InputDecoration(
                        labelText: 'Auth Token (Bearer)',
                        hintText: 'Paste your JWT token here',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.key),
                      ),
                      maxLines: 3,
                      minLines: 1,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email to Invite',
                        hintText: 'user@example.com',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.email),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_businesses.isNotEmpty) ...[
                      Text(
                        '🐛 DEBUG: businesses=${_businesses.length}, selected=$_selectedBusinessId',
                        style: const TextStyle(fontSize: 10, color: Colors.orange),
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        value: _businesses.any((b) => (b['_id'] ?? '').toString() == _selectedBusinessId)
                            ? _selectedBusinessId
                            : null,
                        decoration: InputDecoration(
                          labelText: 'Business',
                          border: const OutlineInputBorder(),
                          prefixIcon: const Icon(Icons.business),
                          suffixIcon: _isLoadingBusinesses
                              ? const Padding(
                                  padding: EdgeInsets.all(12),
                                  child: SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                )
                              : IconButton(
                                  icon: const Icon(Icons.refresh),
                                  tooltip: 'Reload businesses from login',
                                  onPressed: () async => _loadBusinessesFromLogin(),
                                ),
                        ),
                        items: _businesses
                            .map((business) {
                              final id = (business['_id'] ?? '').toString();
                              if (id.isEmpty) {
                                return null;
                              }
                              final name = (business['businessName'] ?? 'Unnamed Business').toString();
                              final type = (business['type'] ?? 'team').toString();
                              final isOwned = type == 'owned';
                              final grantedBy = (business['grantedBy'] ?? '').toString();

                              return DropdownMenuItem<String>(
                                value: id,
                                child: SizedBox(
                                  height: 48,
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      Icon(
                                        isOwned ? Icons.business : Icons.group,
                                        size: 20,
                                        color: isOwned ? Colors.green : Colors.blue,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              name,
                                              style: const TextStyle(fontWeight: FontWeight.w600),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            Text(
                                              isOwned ? 'Owned business' : 'Team access',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: isOwned ? Colors.green : Colors.blue,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (!isOwned)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: Colors.orange.shade200,
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: Colors.orange.shade400, width: 1.5),
                                          ),
                                          child: Text(
                                            grantedBy.isNotEmpty
                                                ? 'ID: ${grantedBy.length > 8 ? grantedBy.substring(grantedBy.length - 8) : grantedBy}'
                                                : 'TEAM',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.orange.shade800,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            })
                            .whereType<DropdownMenuItem<String>>()
                            .toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedBusinessId = value;
                            _businessIdController.text = value ?? '';
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                    ] else ...[
                      TextFormField(
                        controller: _businessIdController,
                        decoration: InputDecoration(
                          labelText: 'Business ID (no businesses cached)',
                          hintText: '68e8d6caaf91efc4cf7f223e',
                          border: const OutlineInputBorder(),
                          prefixIcon: const Icon(Icons.business),
                          suffixIcon: _isLoadingBusinesses
                              ? const Padding(
                                  padding: EdgeInsets.all(12),
                                  child: SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                )
                              : IconButton(
                                  icon: const Icon(Icons.download),
                                  tooltip: 'Load from login data',
                                  onPressed: () async => _loadBusinessesFromLogin(),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    DropdownButtonFormField<String>(
                      value: _selectedRole,
                      decoration: const InputDecoration(
                        labelText: 'Role',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.person),
                      ),
                      items: const ['staff', 'supervisor', 'manager', 'admin']
                          .map(
                            (role) => DropdownMenuItem(
                              value: role,
                              child: Text(role.toUpperCase()),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _selectedRole = value);
                        }
                      },
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _selectedAccessLevel,
                      decoration: const InputDecoration(
                        labelText: 'Access Level',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.security),
                      ),
                      items:
                          const [
                                'view_only',
                                'manage_operations',
                                'full_access',
                              ]
                              .map(
                                (level) => DropdownMenuItem(
                                  value: level,
                                  child: Text(
                                    level.replaceAll('_', ' ').toUpperCase(),
                                  ),
                                ),
                              )
                              .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _selectedAccessLevel = value);
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _isLoading ? null : _testInvitation,
              icon: _isLoading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send),
              label: const Text('Send Invitation'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _isLoading ? null : _testGetTeamMembers,
              icon: const Icon(Icons.group),
              label: const Text('Fetch My Team'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _isLoading ? null : _testCheckAccess,
              icon: const Icon(Icons.verified_user),
              label: const Text('Check My Access'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            const SizedBox(height: 24),
            _buildTeamDataSection(),
            const SizedBox(height: 24),
            _buildRequestSection(),
            const SizedBox(height: 16),
            _buildResponseSection(),
            const SizedBox(height: 16),
            _buildRawResponseSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamDataSection() {
    if (_teamData == null && _members.isEmpty) {
      return const SizedBox.shrink();
    }

    final status = _teamData?['status']?.toString() ?? 'unknown';
    final totalMembers =
        (_teamData?['count'] as num?)?.toInt() ?? _members.length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Fetched Team Members',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Chip(
                  label: Text(status.toUpperCase()),
                  backgroundColor: status.toLowerCase() == 'success'
                      ? Colors.green[100]
                      : Colors.orange[100],
                ),
                const SizedBox(width: 8),
                Text('Total Members: $totalMembers'),
              ],
            ),
            if (_fetchError != null) ...[
              const SizedBox(height: 8),
              Text(_fetchError!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 12),
            if (_members.isEmpty)
              const Text('No members returned by the API.')
            else
              ..._members.map(_buildMemberCard),
          ],
        ),
      ),
    );
  }

  Widget _buildMemberCard(Map<String, dynamic> member) {
    String formatName(Map<String, dynamic>? data) {
      if (data == null) return '';
      final full = data['fullName']?.toString().trim();
      if (full != null && full.isNotEmpty) return full;

      final first = data['firstName']?.toString().trim();
      final last = data['lastName']?.toString().trim();
      final parts = <String>[];
      if (first != null && first.isNotEmpty) parts.add(first);
      if (last != null && last.isNotEmpty) parts.add(last);
      if (parts.isNotEmpty) return parts.join(' ');

      final name = data['name']?.toString().trim();
      if (name != null && name.isNotEmpty) return name;

      return '';
    }

    final employee = (member['employee'] as Map?)?.cast<String, dynamic>();
    final managedUser = (member['managedUser'] as Map?)
        ?.cast<String, dynamic>();

    final fullName = () {
      final name = formatName(employee);
      if (name.isNotEmpty) return name;
      final managedName = formatName(managedUser);
      if (managedName.isNotEmpty) return managedName;
      return 'Unnamed';
    }();

    final email =
        member['userEmail']?.toString() ??
        employee?['email']?.toString() ??
        managedUser?['email']?.toString() ??
        'N/A';

    final role = (member['role'] ?? '-').toString();
    final accessLevel = (member['accessLevel'] ?? '-').toString();
    final memberStatus = (member['status'] ?? '-').toString();
    final isActive = member['isAccessValid'] == true;

    final businessContext =
        (member['businessContext'] as Map?)?.cast<String, dynamic>();
    final businessId =
        (businessContext?['businessId'] ?? member['businessId'] ?? '—').toString();
    final businessName = (businessContext?['businessName'] ??
            businessContext?['name'] ??
            businessContext?['label'])
        ?.toString();
    final businessLabel = (businessName != null && businessName.isNotEmpty)
        ? businessName
        : (businessId.isNotEmpty ? businessId : 'Unknown');

    final grantedByRaw = member['grantedBy'];
    final createdByRaw = member['createdBy'];
    final permissions =
        (member['effectivePermissions'] as Map?)?.cast<String, dynamic>() ?? {};

    String resolveUserDisplay(String key, dynamic rawValue) {
      Map<String, dynamic>? asMap;
      if (rawValue is Map) {
        asMap = rawValue.cast<String, dynamic>();
      }
      final alternative = member['${key}User'];
      if (asMap == null && alternative is Map) {
        asMap = alternative.cast<String, dynamic>();
      }
      if (asMap != null) {
        return _formatUserInfo(asMap);
      }

      final fallback = rawValue ?? member['${key}Name'] ?? member['${key}Email'];
      if (fallback is Map) {
        return _formatUserInfo(fallback.cast<String, dynamic>());
      }
      final fallbackText = fallback?.toString().trim() ?? '';
      if (fallbackText.isEmpty) {
        return '—';
      }
      final hex24 = RegExp(r'^[a-fA-F0-9]{24}$');
      if (hex24.hasMatch(fallbackText)) {
        return 'ID: ${fallbackText.substring(fallbackText.length - 6)}';
      }
      return fallbackText;
    }

    final grantedByDisplay = resolveUserDisplay('grantedBy', grantedByRaw);
    final createdByDisplay = resolveUserDisplay('createdBy', createdByRaw);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      color: isActive ? Colors.green[50] : Colors.red[50],
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: ExpansionTile(
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                fullName,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                memberStatus.toUpperCase(),
                style: TextStyle(
                  color: isActive ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          subtitle: Text('$email\nRole: $role | Access: $accessLevel'),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Business: $businessLabel'),
                  Text('Granted By: $grantedByDisplay'),
                  if (createdByDisplay != '—')
                    Text('Created By: $createdByDisplay'),
                  const SizedBox(height: 8),
                  const Text(
                    'Permissions:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  if (permissions.isEmpty)
                    const Text('No permissions granted.')
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: permissions.entries.map((entry) {
                        final label = entry.key.toString().replaceAll(
                          'can',
                          '',
                        );
                        final enabled = entry.value == true;
                        return Chip(
                          label: Text(label),
                          backgroundColor: enabled
                              ? Colors.blue[100]
                              : Colors.grey[200],
                        );
                      }).toList(),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestSection() {
    if (_requestUrl == null) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Request Details',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            SelectableText(
              'GET $_requestUrl',
              style: const TextStyle(fontFamily: 'monospace'),
            ),
            const SizedBox(height: 12),
            const Text(
              'Headers:',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            if (_requestHeaders != null && _requestHeaders!.isNotEmpty)
              ..._requestHeaders!.entries.map(
                (entry) => SelectableText(
                  '${entry.key}: ${entry.value}',
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
              )
            else
              const Text('No headers sent'),
          ],
        ),
      ),
    );
  }

  Widget _buildResponseSection() {
    if (_responseStatus == null) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Response Details',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Status: $_responseStatus',
              style: TextStyle(
                color: (_responseStatus ?? 0) == 200
                    ? Colors.green
                    : Colors.red,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Headers:',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            if (_responseHeaders != null && _responseHeaders!.isNotEmpty)
              ..._responseHeaders!.entries.map(
                (entry) => SelectableText(
                  '${entry.key}: ${entry.value}',
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
              )
            else
              const Text('No response headers'),
          ],
        ),
      ),
    );
  }

  Widget _buildRawResponseSection() {
    if (_responseBodyPretty == null) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Response Body',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(6),
              ),
              padding: const EdgeInsets.all(12),
              child: SelectableText(
                _responseBodyPretty!,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _prettyPrintJson(dynamic data) {
    try {
      const encoder = JsonEncoder.withIndent('  ');
      if (data is String) {
        final decoded = json.decode(data);
        return encoder.convert(decoded);
      }
      return encoder.convert(data);
    } catch (_) {
      if (data is String) return data;
      return data?.toString() ?? '';
    }
  }
}
*/
