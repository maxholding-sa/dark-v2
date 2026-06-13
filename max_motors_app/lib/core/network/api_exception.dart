import 'package:dio/dio.dart';

/// Normalized error surfaced to the UI layer (Arabic-friendly messages).
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;

  factory ApiException.fromDio(DioException e) {
    final status = e.response?.statusCode;
    // Try to read a server-provided message: { message } or { error }.
    final data = e.response?.data;
    String? serverMsg;
    if (data is Map) {
      serverMsg = (data['message'] ?? data['error'])?.toString();
    }

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException('انتهت مهلة الاتصال. حاول مرة أخرى.',
            statusCode: status);
      case DioExceptionType.connectionError:
        return ApiException(
          'تعذر الاتصال بالخادم. شغّل الموقع بـ npm run dev في مجلد dark-v2 ثم أعد المحاولة.',
          statusCode: status,
        );
      case DioExceptionType.badResponse:
        return ApiException(
          serverMsg ?? _statusMessage(status),
          statusCode: status,
        );
      case DioExceptionType.cancel:
        return ApiException('تم إلغاء الطلب.', statusCode: status);
      default:
        return ApiException(serverMsg ?? 'حدث خطأ غير متوقع.',
            statusCode: status);
    }
  }

  static String _statusMessage(int? status) {
    switch (status) {
      case 400:
        return 'طلب غير صالح.';
      case 401:
        return 'يجب تسجيل الدخول.';
      case 403:
        return 'لا تملك صلاحية الوصول.';
      case 404:
        return 'لم يتم العثور على البيانات.';
      case 405:
        return 'العملية غير مسموح بها.';
      case 500:
        return 'خطأ في الخادم. حاول لاحقاً.';
      default:
        return 'حدث خطأ. حاول مرة أخرى.';
    }
  }
}
