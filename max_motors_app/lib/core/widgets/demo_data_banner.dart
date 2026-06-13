import 'package:flutter/material.dart';

import '../../core/config/app_config.dart';
import '../../data/demo/demo_catalog_data.dart';
import '../theme/app_colors.dart';

/// Shown at the top of lists when demo cars are in use.
class DemoDataBanner extends StatelessWidget {
  const DemoDataBanner({super.key});

  @override
  Widget build(BuildContext context) {
    if (!AppConfig.useDemoCatalog && !DemoCatalogData.active) {
      return const SizedBox.shrink();
    }
    return Material(
      color: AppColors.bronze.withValues(alpha: 0.25),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            const Icon(Icons.info_outline, color: AppColors.gold, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'بيانات تجريبية — قاعدة البيانات غير متصلة. '
                'فعّل مشروع Supabase وحدّث .env لعرض السيارات الحقيقية.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.mutedForeground,
                      height: 1.35,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
