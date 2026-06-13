import 'package:dio/dio.dart';

import '../config/app_config.dart';
import 'api_exception.dart';
import 'dio_client.dart';

/// Reads public data from the deployed Next.js `/api/*` routes (Prisma backend).
class ApiClient {
  ApiClient._();

  static bool get isConfigured =>
      AppConfig.apiBaseUrl.isNotEmpty &&
      !AppConfig.apiBaseUrl.contains('example.com');

  /// GET `{ success, data, pagination? }` and return the decoded body map.
  static Future<Map<String, dynamic>> getEnvelope(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    if (!isConfigured) {
      throw ApiException(
        'لم يتم ضبط رابط الخادم. شغّل الموقع محلياً أو مرّر API_BASE_URL عند التشغيل.',
      );
    }
    try {
      final res = await DioClient.instance.get(
        path,
        queryParameters: queryParameters,
      );
      final body = res.data;
      if (body is! Map<String, dynamic>) {
        throw ApiException(
          'استجابة غير صالحة من الخادم.',
          statusCode: res.statusCode,
        );
      }
      if (body['success'] != true) {
        final raw =
            body['error']?.toString() ?? body['message']?.toString() ?? '';
        throw ApiException(
          _friendlyApiError(raw),
          statusCode: res.statusCode,
        );
      }
      return body;
    } catch (e) {
      DioClient.rethrowAsApi(e);
    }
  }

  static Future<dynamic> getData(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final body = await getEnvelope(path, queryParameters: queryParameters);
    return body['data'];
  }

  static String _friendlyApiError(String raw) {
    if (raw.isEmpty) return 'فشل تحميل البيانات.';
    final lower = raw.toLowerCase();
    if (lower.contains('enotfound') ||
        lower.contains('tenant/user') ||
        lower.contains('can\'t reach database')) {
      return 'قاعدة البيانات غير متاحة. حدّث DATABASE_URL و DIRECT_URL '
          'في ملف .env من مشروع Supabase النشط، ثم أعد تشغيل npm run dev.';
    }
    if (lower.contains('prisma') || lower.contains('invocation')) {
      return 'خطأ في الخادم أثناء قراءة البيانات. تحقق من إعدادات قاعدة البيانات.';
    }
    return raw.length > 180 ? '${raw.substring(0, 180)}…' : raw;
  }

  static List<Map<String, dynamic>> asMapList(dynamic data) {
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }
}
