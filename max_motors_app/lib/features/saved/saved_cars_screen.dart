import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/gradient_button.dart';
import '../../data/local/local_favorites.dart';
import '../../data/models/car.dart';
import '../../data/providers.dart';
import '../cars/widgets/car_card.dart';

/// Loads the locally-saved car ids, then fetches each one. Lives in the
/// "المفضلة" bottom-nav branch.
final savedCarsProvider = FutureProvider.autoDispose<List<Car>>((ref) async {
  final ids = await LocalFavorites.instance.getIds();
  if (ids.isEmpty) return const [];
  final repo = ref.watch(catalogRepositoryProvider);
  final results = await Future.wait(ids.map((id) async {
    try {
      return await repo.getCarById(id);
    } catch (_) {
      return null;
    }
  }));
  return results.whereType<Car>().toList();
});

class SavedCarsScreen extends ConsumerWidget {
  const SavedCarsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedCarsProvider);

    return Scaffold(
      body: Stack(
        children: [
          // ── Background Glow ──
          Positioned(
            top: -100,
            right: -100,
            child: ImageFiltered(
              imageFilter: ImageFilter.blur(sigmaX: 90, sigmaY: 90),
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.goldGlow,
                ),
              ),
            ),
          ),

          RefreshIndicator(
            color: AppColors.gold,
            backgroundColor: AppColors.surface,
            onRefresh: () async => ref.invalidate(savedCarsProvider),
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // ── Frosted Glass AppBar ──
                SliverAppBar(
                  pinned: true,
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  scrolledUnderElevation: 0,
                  centerTitle: true,
                  title: ShaderMask(
                    shaderCallback: (bounds) => const LinearGradient(
                      colors: AppColors.goldTextGradient,
                    ).createShader(bounds),
                    child: const Text(
                      'المفضلة',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 20,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  flexibleSpace: ClipRRect(
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                      child: Container(
                        color: AppColors.black.withValues(alpha: 0.7),
                        child: Align(
                          alignment: Alignment.bottomCenter,
                          child: Container(
                            height: 1,
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: AppColors.goldGradientBorder,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

                // ── Saved Cars Grid/List Content ──
                ...saved.when(
                  loading: () => [
                    const SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: EdgeInsets.all(80),
                          child: CircularProgressIndicator(color: AppColors.gold),
                        ),
                      ),
                    ),
                  ],
                  error: (e, _) => [
                    SliverToBoxAdapter(
                      child: ErrorState(
                        message: e.toString(),
                        onRetry: () => ref.invalidate(savedCarsProvider),
                      ),
                    ),
                  ],
                  data: (cars) {
                    if (cars.isEmpty) {
                      return [
                        SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: AppColors.border,
                                  width: 0.8,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(20),
                                child: BackdropFilter(
                                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                                  child: Container(
                                    color: AppColors.surface.withValues(alpha: 0.5),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(14),
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: AppColors.gold.withValues(alpha: 0.08),
                                          ),
                                          child: const Icon(
                                            Icons.favorite_outline_rounded,
                                            color: AppColors.gold,
                                            size: 40,
                                          ),
                                        ),
                                        const SizedBox(height: 18),
                                        ShaderMask(
                                          shaderCallback: (bounds) => const LinearGradient(
                                            colors: AppColors.goldTextGradient,
                                          ).createShader(bounds),
                                          child: const Text(
                                            'قائمة المفضلة فارغة',
                                            style: TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.w900,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        const Text(
                                          'تصفح السيارات المفضلة لديك وقم بحفظها لتظهر هنا للوصول السريع والعروض.',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            color: AppColors.mutedForeground,
                                            fontSize: 13,
                                            height: 1.6,
                                          ),
                                        ),
                                        const SizedBox(height: 24),
                                        GradientButton(
                                          label: 'تصفح السيارات المعروضة',
                                          onPressed: () => context.go('/cars'),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ];
                    }
                    return [
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        sliver: SliverGrid(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 16,
                            crossAxisSpacing: 16,
                            childAspectRatio: 0.69,
                          ),
                          delegate: SliverChildBuilderDelegate(
                            (context, i) => CarCard(car: cars[i]),
                            childCount: cars.length,
                          ),
                        ),
                      ),
                    ];
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
