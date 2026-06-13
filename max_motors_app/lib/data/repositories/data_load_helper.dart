import '../../core/config/app_config.dart';
import '../../core/network/api_exception.dart';
import '../demo/demo_catalog_data.dart';
import '../models/paginated.dart';
import 'content_repository.dart';

const _remoteTimeout = Duration(seconds: 8);

/// Tries [primary], then [fallback]. Uses [demo] when both fail or in demo mode.
Future<T> loadWithFallback<T>({
  required Future<T> Function() primary,
  required Future<T> Function() fallback,
  T Function()? demo,
  String context = 'تحميل البيانات',
  bool Function(T result)? isEmpty,
}) async {
  if (AppConfig.useDemoCatalog && demo != null) {
    return demo();
  }

  Object? primaryError;
  Object? fallbackError;

  try {
    DemoCatalogData.markInactive();
    final result = await primary().timeout(
      _remoteTimeout,
      onTimeout: () => throw ApiException('انتهت مهلة Supabase'),
    );
    if (isEmpty != null && isEmpty(result)) {
      throw ApiException('لا توجد بيانات من Supabase');
    }
    return result;
  } catch (e) {
    primaryError = e;
  }

  try {
    DemoCatalogData.markInactive();
    final result = await fallback().timeout(
      _remoteTimeout,
      onTimeout: () => throw ApiException('انتهت مهلة الخادم المحلي'),
    );
    if (isEmpty != null && isEmpty(result)) {
      throw ApiException('لا توجد بيانات من API');
    }
    return result;
  } catch (e) {
    fallbackError = e;
  }

  if (demo != null) {
    return demo();
  }

  throw ApiException(_formatLoadFailure(context, primaryError, fallbackError));
}

String _formatLoadFailure(String context, Object? primary, Object? fallback) {
  final p = _message(primary);
  final f = _message(fallback);
  return '$context\n\n'
      '• Supabase: $p\n'
      '• الخادم المحلي (API): $f\n\n'
      'مشروع Supabase غير متاح (تحقق من لوحة التحكم وملف .env: '
      'SUPABASE_URL و DATABASE_URL)، ثم شغّل npm run dev -- -p 3001';
}

String _message(Object? error) {
  if (error == null) return 'خطأ غير معروف';
  if (error is ApiException) return error.message;
  final text = error.toString();
  if (text.contains('ENOTFOUND') || text.contains('Failed host lookup')) {
    return 'لا يمكن الوصول إلى خادم Supabase (المشروع قد يكون موقوفاً أو محذوفاً)';
  }
  if (text.contains('tenant/user') || text.contains('can\'t reach database')) {
    return 'قاعدة البيانات غير متاحة — حدّث DATABASE_URL من مشروع Supabase نشط';
  }
  return text.length > 120 ? '${text.substring(0, 120)}…' : text;
}

bool paginatedCarsEmpty(Paginated<dynamic> p) => p.items.isEmpty;

bool homeContentEmpty(HomeContent c) =>
    c.featuredCars.isEmpty && c.brands.isEmpty;

bool listEmpty<T>(List<T> list) => list.isEmpty;
