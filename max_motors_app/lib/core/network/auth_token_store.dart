import 'package:flutter/foundation.dart';

/// Holds the latest Clerk session JWT so the Dio interceptor can attach it as
/// a Bearer token. Updated from the Clerk `sessionTokenStream` (see
/// `ClerkSessionSync`).
class AuthTokenStore extends ValueNotifier<String?> {
  AuthTokenStore._() : super(null);

  static final AuthTokenStore instance = AuthTokenStore._();

  String? get token => value;

  void update(String? jwt) {
    if (value != jwt) value = jwt;
  }

  void clear() => update(null);
}
