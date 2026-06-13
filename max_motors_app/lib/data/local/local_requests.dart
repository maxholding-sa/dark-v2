import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// A locally-recorded user request (loan / test-drive / company) shown under
/// the "حجوزاتي / طلباتي" (reservations) tab.
class MyRequest {
  MyRequest({
    required this.type,
    required this.title,
    required this.subtitle,
    required this.createdAt,
  });

  final String type; // loan | test_drive | company
  final String title;
  final String subtitle;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
        'type': type,
        'title': title,
        'subtitle': subtitle,
        'createdAt': createdAt.toIso8601String(),
      };

  factory MyRequest.fromJson(Map<String, dynamic> json) => MyRequest(
        type: json['type']?.toString() ?? 'loan',
        title: json['title']?.toString() ?? '',
        subtitle: json['subtitle']?.toString() ?? '',
        createdAt:
            DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}

class LocalRequests {
  LocalRequests._();
  static final LocalRequests instance = LocalRequests._();

  static const _key = 'my_requests';
  SharedPreferences? _prefs;

  Future<SharedPreferences> get _p async =>
      _prefs ??= await SharedPreferences.getInstance();

  Future<List<MyRequest>> getAll() async {
    final p = await _p;
    final raw = p.getStringList(_key) ?? const [];
    return raw
        .map((e) => MyRequest.fromJson(jsonDecode(e) as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<void> add(MyRequest request) async {
    final p = await _p;
    final raw = p.getStringList(_key) ?? const <String>[];
    final updated = [...raw, jsonEncode(request.toJson())];
    await p.setStringList(_key, updated);
  }

  Future<void> clear() async {
    final p = await _p;
    await p.remove(_key);
  }
}
