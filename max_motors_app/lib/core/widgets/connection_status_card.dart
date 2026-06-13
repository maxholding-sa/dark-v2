import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/demo/demo_catalog_data.dart';
import '../config/app_config.dart';
import '../theme/app_colors.dart';
import 'glass_card.dart';

/// Quick read-only summary of which backend the app is using.
class ConnectionStatusCard extends ConsumerWidget {
  const ConnectionStatusCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supabaseHost = _host(AppConfig.supabaseUrl);
    final api = AppConfig.apiBaseUrl;
    final mode = AppConfig.useDemoCatalog || DemoCatalogData.active
        ? 'بيانات تجريبية'
        : 'بيانات حقيقية';

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'اتصال التطبيق',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
          ),
          const SizedBox(height: 8),
          _row('الوضع', mode),
          _row('API', api.isEmpty ? 'غير مضبوط' : api),
          _row('Supabase', supabaseHost.isEmpty ? 'غير مضبوط' : supabaseHost),
          if (AppConfig.useDemoCatalog || DemoCatalogData.active) ...[
            const SizedBox(height: 8),
            const Text(
              'للاتصال الحقيقي: حدّث .env ثم شغّل SQL في Supabase '
              '(scripts/supabase-enable-anon-read.sql) وأعد تشغيل التطبيق '
              'بـ --dart-define=USE_DEMO_DATA=false',
              style: TextStyle(
                color: AppColors.mutedForeground,
                fontSize: 11,
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _host(String url) {
    if (url.isEmpty) return '';
    try {
      return Uri.parse(url).host;
    } catch (_) {
      return url;
    }
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(
          children: [
            SizedBox(
              width: 72,
              child: Text(
                label,
                style: const TextStyle(
                  color: AppColors.mutedForeground,
                  fontSize: 12,
                ),
              ),
            ),
            Expanded(
              child: Text(
                value,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );
}
