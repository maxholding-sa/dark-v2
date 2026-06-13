import 'package:dio/dio.dart';

import '../config/app_config.dart';
import 'api_exception.dart';
import 'auth_token_store.dart';

/// Configured [Dio] instance pointed at the deployed Next.js backend.
/// Attaches the Clerk session JWT (when available) and normalizes errors.
class DioClient {
  DioClient._();

  static final Dio instance = _build();

  static Dio _build() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        headers: {'Accept': 'application/json'},
        // Don't throw automatically on >= 400 so repositories can read bodies.
        validateStatus: (status) => status != null && status < 500,
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = AuthTokenStore.instance.token;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (e, handler) {
          // Re-wrap as ApiException downstream; keep DioException flowing.
          handler.next(e);
        },
      ),
    );

    return dio;
  }

  /// Helper to translate any thrown error into an [ApiException].
  static Never rethrowAsApi(Object error) {
    if (error is DioException) throw ApiException.fromDio(error);
    if (error is ApiException) throw error;
    throw ApiException(error.toString());
  }
}
