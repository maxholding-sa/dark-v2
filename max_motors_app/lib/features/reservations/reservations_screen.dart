import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../data/local/local_requests.dart';

final myRequestsProvider =
    FutureProvider.autoDispose<List<MyRequest>>((ref) {
  return LocalRequests.instance.getAll();
});

class ReservationsScreen extends ConsumerWidget {
  const ReservationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requests = ref.watch(myRequestsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('طلباتي وحجوزاتي'),
        actions: [
          IconButton(
            tooltip: 'مسح الكل',
            icon: const Icon(Icons.delete_sweep_rounded),
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.surface,
                  title: const Text('مسح كل الطلبات؟'),
                  content: const Text('سيتم حذف سجل طلباتك المحفوظ على الجهاز.'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('إلغاء'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('مسح'),
                    ),
                  ],
                ),
              );
              if (confirmed == true) {
                await LocalRequests.instance.clear();
                ref.invalidate(myRequestsProvider);
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myRequestsProvider),
        child: AsyncView(
          value: requests,
          isEmpty: (list) => list.isEmpty,
          emptyMessage: 'لا توجد طلبات محفوظة بعد',
          emptyIcon: Icons.receipt_long_outlined,
          data: (list) => ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _RequestCard(request: list[i]),
          ),
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({required this.request});
  final MyRequest request;

  (IconData, String) get _meta {
    switch (request.type) {
      case 'test_drive':
        return (Icons.drive_eta_rounded, 'قيادة تجريبية');
      case 'company':
        return (Icons.handshake_rounded, 'طلب شركة');
      default:
        return (Icons.request_quote_rounded, 'طلب تمويل');
    }
  }

  @override
  Widget build(BuildContext context) {
    final meta = _meta;
    return GlassCard(
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.surfaceAlt,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(meta.$1, color: AppColors.gold),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(meta.$2,
                        style: const TextStyle(
                            color: AppColors.gold,
                            fontSize: 11,
                            fontWeight: FontWeight.w700)),
                    const Spacer(),
                    Text(Formatters.dateArabic(request.createdAt),
                        style: const TextStyle(
                            color: AppColors.mutedForeground, fontSize: 11)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(request.title,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                if (request.subtitle.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(request.subtitle,
                      style: const TextStyle(
                          color: AppColors.mutedForeground, fontSize: 12)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
