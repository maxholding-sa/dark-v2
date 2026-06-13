import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/demo_data_banner.dart';
import '../../data/models/car_filters.dart';
import '../../data/providers.dart';
import 'widgets/car_card.dart';
import 'widgets/car_filters_sheet.dart';

class CarsScreen extends ConsumerStatefulWidget {
  const CarsScreen({super.key});

  @override
  ConsumerState<CarsScreen> createState() => _CarsScreenState();
}

class _CarsScreenState extends ConsumerState<CarsScreen>
    with SingleTickerProviderStateMixin {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();
  bool _isGridView = true;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _searchController.text = ref.read(carQueryProvider).search;
    _focusNode.addListener(() {
      setState(() => _isFocused = _focusNode.hasFocus);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _openFilters() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const CarFiltersSheet(),
    );
  }

  void _submitSearch(String value) {
    final q = ref.read(carQueryProvider);
    ref.read(carQueryProvider.notifier).state =
        q.copyWith(search: value, page: 1, limit: 20);
  }

  @override
  Widget build(BuildContext context) {
    final cars = ref.watch(carsProvider);
    final query = ref.watch(carQueryProvider);
    final hasActiveFilters = query.make.isNotEmpty ||
        query.bodyType.isNotEmpty ||
        query.fuelType.isNotEmpty ||
        query.transmission.isNotEmpty ||
        query.minPrice != null ||
        query.maxPrice != null;

    // Count active filters
    int filterCount = 0;
    if (query.make.isNotEmpty) filterCount++;
    if (query.bodyType.isNotEmpty) filterCount++;
    if (query.fuelType.isNotEmpty) filterCount++;
    if (query.transmission.isNotEmpty) filterCount++;
    if (query.minPrice != null || query.maxPrice != null) filterCount++;

    ref.listen(carQueryProvider, (previous, next) {
      if (next.search != _searchController.text) {
        _searchController.text = next.search;
      }
    });

    return Scaffold(
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async => ref.invalidate(carsProvider),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ── Premium Frosted Glass AppBar ──
            SliverAppBar(
              pinned: true,
              floating: true,
              snap: true,
              backgroundColor: Colors.transparent,
              elevation: 0,
              scrolledUnderElevation: 0,
              centerTitle: true,
              flexibleSpace: ClipRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.black.withValues(alpha: 0.75),
                      border: Border(
                        bottom: BorderSide(
                          color: AppColors.gold.withValues(alpha: 0.25),
                          width: 0.8,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              title: const _AnimatedCarsTitle(),
              actions: [
                // View toggle with styled container
                Container(
                  margin: const EdgeInsets.only(left: 8),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.surfaceAlt.withValues(alpha: 0.6),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: IconButton(
                    icon: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 250),
                      transitionBuilder: (child, anim) =>
                          ScaleTransition(scale: anim, child: child),
                      child: Icon(
                        _isGridView
                            ? Icons.view_list_rounded
                            : Icons.grid_view_rounded,
                        key: ValueKey(_isGridView),
                        color: AppColors.goldLight,
                        size: 20,
                      ),
                    ),
                    tooltip: _isGridView ? 'عرض القائمة' : 'عرض الشبكة',
                    onPressed: () {
                      setState(() {
                        _isGridView = !_isGridView;
                      });
                    },
                  ),
                ),
              ],
            ),

            // ── Search Bar + Filter Button ──
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const DemoDataBanner(),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                    child: Row(
                      children: [
                        // Premium search bar
                        Expanded(
                          child: _buildPremiumSearchBar(),
                        ),
                        const SizedBox(width: 12),
                        // Filter button
                        _buildFilterButton(hasActiveFilters, filterCount),
                      ],
                    ),
                  ),
                  _buildActiveFilters(query),
                  const SizedBox(height: 6),
                ],
              ),
            ),

            // ── Cars Content ──
            ...cars.when(
              loading: () => [
                _CarShimmerSliver(isListView: !_isGridView),
              ],
              error: (e, _) => [
                SliverToBoxAdapter(
                  child: ErrorState(
                    message: e.toString(),
                    onRetry: () => ref.invalidate(carsProvider),
                  ),
                )
              ],
              data: (paginated) {
                if (paginated.items.isEmpty) {
                  return [
                    const SliverToBoxAdapter(
                      child: EmptyState(
                        message: 'لا توجد سيارات مطابقة',
                        icon: Icons.directions_car_outlined,
                      ),
                    )
                  ];
                }
                return [
                  if (_isGridView)
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      sliver: SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 14,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.62,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, i) {
                            if (i >= paginated.items.length) {
                              return _LoadMoreTile(
                                isListView: false,
                                onTap: () {
                                  final q = ref.read(carQueryProvider);
                                  ref.read(carQueryProvider.notifier).state =
                                      q.copyWith(limit: q.limit + 20);
                                },
                              );
                            }
                            return CarCard(car: paginated.items[i], isListView: false);
                          },
                          childCount: paginated.items.length + (paginated.hasMore ? 1 : 0),
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, i) {
                            if (i >= paginated.items.length) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _LoadMoreTile(
                                  isListView: true,
                                  onTap: () {
                                    final q = ref.read(carQueryProvider);
                                    ref.read(carQueryProvider.notifier).state =
                                        q.copyWith(limit: q.limit + 20);
                                  },
                                ),
                              );
                            }
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: CarCard(car: paginated.items[i], isListView: true),
                            );
                          },
                          childCount: paginated.items.length + (paginated.hasMore ? 1 : 0),
                        ),
                      ),
                    ),
                  const SliverToBoxAdapter(
                    child: SizedBox(height: 32),
                  ),
                ];
              },
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PREMIUM SEARCH BAR — gold glow on focus
  // ═══════════════════════════════════════════════════════════════
  Widget _buildPremiumSearchBar() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: _isFocused
            ? const LinearGradient(
                colors: AppColors.goldGradientBorder,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        boxShadow: _isFocused
            ? [
                BoxShadow(
                  color: AppColors.goldGlow,
                  blurRadius: 20,
                  spreadRadius: 2,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      padding: EdgeInsets.all(_isFocused ? 1.5 : 0),
      child: Container(
        decoration: BoxDecoration(
          color: _isFocused
              ? AppColors.surface.withValues(alpha: 0.95)
              : AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(_isFocused ? 12.5 : 14),
          border: _isFocused ? null : Border.all(color: AppColors.border),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        child: TextField(
          controller: _searchController,
          focusNode: _focusNode,
          textInputAction: TextInputAction.search,
          onSubmitted: _submitSearch,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'ابحث عن سيارة...',
            hintStyle: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
            prefixIcon: AnimatedScale(
              scale: _isFocused ? 1.15 : 1.0,
              duration: const Duration(milliseconds: 200),
              child: const Icon(Icons.search_rounded, color: AppColors.gold, size: 20),
            ),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
            suffixIcon: _searchController.text.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.close_rounded, color: AppColors.mutedForeground, size: 18),
                    onPressed: () {
                      _searchController.clear();
                      _submitSearch('');
                    },
                  ),
          ),
          onChanged: (text) {
            setState(() {});
          },
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // FILTER BUTTON — with counter badge
  // ═══════════════════════════════════════════════════════════════
  Widget _buildFilterButton(bool hasActive, int count) {
    return GestureDetector(
      onTap: _openFilters,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: hasActive
              ? AppColors.gold.withValues(alpha: 0.12)
              : AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: hasActive
                ? AppColors.gold.withValues(alpha: 0.35)
                : AppColors.border,
            width: hasActive ? 1.2 : 0.8,
          ),
          boxShadow: hasActive
              ? [
                  BoxShadow(
                    color: AppColors.goldGlow,
                    blurRadius: 12,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            const Icon(Icons.tune_rounded, color: AppColors.goldLight, size: 22),
            if (hasActive)
              Positioned(
                right: -6,
                top: -6,
                child: Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: AppColors.goldButtonGradient,
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.goldGlow,
                        blurRadius: 6,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      '$count',
                      style: const TextStyle(
                        color: AppColors.black,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTIVE FILTER CHIPS — glass style
  // ═══════════════════════════════════════════════════════════════
  Widget _buildActiveFilters(CarQuery query) {
    final chips = <Widget>[];

    if (query.make.isNotEmpty) {
      chips.add(_filterChip('الماركة: ${query.make}', Icons.directions_car_rounded, () {
        ref.read(carQueryProvider.notifier).state = query.copyWith(make: '', page: 1);
      }));
    }
    if (query.bodyType.isNotEmpty) {
      chips.add(_filterChip('الهيكل: ${query.bodyType}', Icons.car_rental_rounded, () {
        ref.read(carQueryProvider.notifier).state = query.copyWith(bodyType: '', page: 1);
      }));
    }
    if (query.fuelType.isNotEmpty) {
      chips.add(_filterChip('الوقود: ${query.fuelType}', Icons.local_gas_station_rounded, () {
        ref.read(carQueryProvider.notifier).state = query.copyWith(fuelType: '', page: 1);
      }));
    }
    if (query.transmission.isNotEmpty) {
      chips.add(_filterChip('ناقل الحركة: ${query.transmission}', Icons.settings_rounded, () {
        ref.read(carQueryProvider.notifier).state = query.copyWith(transmission: '', page: 1);
      }));
    }
    if (query.minPrice != null || query.maxPrice != null) {
      if (query.minPrice != null && query.maxPrice != null) {
        chips.add(_filterChip('السعر: ${query.minPrice!.toInt()} - ${query.maxPrice!.toInt()}', Icons.payments_rounded, () {
          ref.read(carQueryProvider.notifier).state = query.copyWith(minPrice: null, maxPrice: null, page: 1);
        }));
      }
    }

    if (chips.isEmpty) return const SizedBox.shrink();

    return Container(
      height: 40,
      margin: const EdgeInsets.only(bottom: 4),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: chips,
      ),
    );
  }

  Widget _filterChip(String label, IconData icon, VoidCallback onDelete) {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.gold.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: AppColors.gold.withValues(alpha: 0.25),
            width: 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: AppColors.goldLight),
            const SizedBox(width: 5),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.white,
              ),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: onDelete,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close_rounded, size: 12, color: AppColors.goldLight),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED TITLE — shimmer gradient
// ═══════════════════════════════════════════════════════════════
class _AnimatedCarsTitle extends StatefulWidget {
  const _AnimatedCarsTitle();

  @override
  State<_AnimatedCarsTitle> createState() => _AnimatedCarsTitleState();
}

class _AnimatedCarsTitleState extends State<_AnimatedCarsTitle>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              colors: AppColors.shimmerGold,
              stops: [
                (_ctrl.value - 0.3).clamp(0.0, 1.0),
                _ctrl.value,
                (_ctrl.value + 0.3).clamp(0.0, 1.0),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ).createShader(bounds);
          },
          child: const Text(
            'سيارات ماكس موتورز',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: 0.3,
            ),
          ),
        );
      },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// LOAD MORE TILE — redesigned
// ═══════════════════════════════════════════════════════════════
class _LoadMoreTile extends StatelessWidget {
  const _LoadMoreTile({required this.onTap, required this.isListView});
  final VoidCallback onTap;
  final bool isListView;

  @override
  Widget build(BuildContext context) {
    final tileContent = GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.gold.withValues(alpha: 0.2),
            width: 0.8,
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.gold.withValues(alpha: 0.1),
                  border: Border.all(
                    color: AppColors.gold.withValues(alpha: 0.25),
                  ),
                ),
                child: const Icon(Icons.expand_more_rounded, color: AppColors.gold, size: 20),
              ),
              const SizedBox(height: 8),
              const Text(
                'عرض المزيد',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.goldLight,
                ),
              ),
            ],
          ),
        ),
      ),
    );

    return isListView
        ? SizedBox(height: 100, child: tileContent)
        : tileContent;
  }
}

// ═══════════════════════════════════════════════════════════════
// SHIMMER — premium skeleton loading
// ═══════════════════════════════════════════════════════════════
class _CarShimmerSliver extends StatelessWidget {
  const _CarShimmerSliver({required this.isListView});
  final bool isListView;

  @override
  Widget build(BuildContext context) {
    return isListView ? _buildListShimmer() : _buildGridShimmer();
  }

  Widget _buildGridShimmer() {
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 14,
          crossAxisSpacing: 12,
          childAspectRatio: 0.62,
        ),
        delegate: SliverChildBuilderDelegate(
          (_, __) => Shimmer.fromColors(
            baseColor: AppColors.surfaceAlt,
            highlightColor: AppColors.surfaceElevated,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          childCount: 6,
        ),
      ),
    );
  }

  Widget _buildListShimmer() {
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (_, __) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Shimmer.fromColors(
              baseColor: AppColors.surfaceAlt,
              highlightColor: AppColors.surfaceElevated,
              child: Container(
                height: 140,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
          childCount: 6,
        ),
      ),
    );
  }
}
