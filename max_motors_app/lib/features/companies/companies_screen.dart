import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/app_network_image.dart';
import '../../core/widgets/async_view.dart';
import '../../data/models/featured_item.dart';
import '../../data/providers.dart';

class CompaniesScreen extends ConsumerWidget {
  const CompaniesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final content = ref.watch(homeContentProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('الشركات المميزة')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(homeContentProvider),
        child: AsyncView(
          value: content,
          isEmpty: (c) => c.brands.isEmpty,
          emptyMessage: 'لا توجد علامات تجارية متاحة حالياً',
          emptyIcon: Icons.business_outlined,
          onRetry: () => ref.invalidate(homeContentProvider),
          data: (c) => GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1,
            ),
            itemCount: c.brands.length,
            itemBuilder: (_, i) =>
                _BrandTile(brand: c.brands[i], ref: ref, context: context),
          ),
        ),
      ),
    );
  }
}

class _BrandTile extends StatelessWidget {
  const _BrandTile({
    required this.brand,
    required this.ref,
    required this.context,
  });

  final FeaturedItem brand;
  final WidgetRef ref;
  final BuildContext context;

  @override
  Widget build(BuildContext _) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          final q = ref.read(carQueryProvider);
          ref.read(carQueryProvider.notifier).state =
              q.copyWith(make: brand.name, page: 1, limit: 20);
          context.go('/cars');
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: AppNetworkImage(url: brand.image, width: 80, height: 80),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                brand.displayName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, color: AppColors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
