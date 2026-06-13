import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/rating_stars.dart';
import '../../data/providers.dart';

/// Admin view of customer reviews. The web API exposes reviews via the same
/// public endpoint, so this reuses [reviewsProvider] for a read-only listing.
class AdminReviewsScreen extends ConsumerWidget {
  const AdminReviewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviews = ref.watch(reviewsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('المراجعات')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(reviewsProvider),
        child: AsyncView(
          value: reviews,
          isEmpty: (list) => list.isEmpty,
          emptyMessage: 'لا توجد مراجعات',
          emptyIcon: Icons.reviews_outlined,
          onRetry: () => ref.invalidate(reviewsProvider),
          data: (list) => ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) {
              final r = list[i];
              return GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(r.clientName,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800)),
                        ),
                        RatingStars(rating: r.rating, size: 16),
                      ],
                    ),
                    if (r.car != null && r.car!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(r.car!,
                          style: const TextStyle(
                              color: AppColors.gold, fontSize: 12)),
                    ],
                    if (r.reviewText != null && r.reviewText!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(r.reviewText!,
                          style: const TextStyle(
                              color: Colors.white70, height: 1.5)),
                    ],
                    if (r.createdAt != null) ...[
                      const SizedBox(height: 8),
                      Text(Formatters.dateArabic(r.createdAt),
                          style: const TextStyle(
                              color: AppColors.mutedForeground, fontSize: 11)),
                    ],
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
