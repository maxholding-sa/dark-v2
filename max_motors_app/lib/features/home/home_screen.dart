import 'dart:ui';

import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/launchers.dart';
import '../../core/widgets/app_network_image.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/demo_data_banner.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/section_header.dart';
import '../../data/models/bank.dart';
import '../../data/models/car_filters.dart';
import '../../data/models/featured_item.dart';
import '../../data/providers.dart';
import '../cars/widgets/car_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final content = ref.watch(homeContentProvider);
    final banks = ref.watch(banksProvider);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF25D366),
        onPressed: () => Launchers.whatsapp('مرحباً، أرغب بالاستفسار عن السيارات'),
        icon: const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white, size: 20),
        label: const Text(
          'تحدث معنا',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: Colors.white,
            fontSize: 14,
          ),
        ),
      ),
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async {
          ref.invalidate(homeContentProvider);
          ref.invalidate(banksProvider);
        },
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
              title: const _AnimatedAppBarTitle(),
              leading: Padding(
                padding: const EdgeInsets.all(10),
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        AppColors.gold.withValues(alpha: 0.15),
                        AppColors.gold.withValues(alpha: 0.05),
                      ],
                    ),
                  ),
                  child: const Icon(Icons.auto_awesome, color: AppColors.gold, size: 18),
                ),
              ),
              actions: [
                Container(
                  margin: const EdgeInsets.only(left: 8),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.surfaceAlt.withValues(alpha: 0.6),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: IconButton(
                    onPressed: () => context.push('/contact'),
                    icon: const Icon(Icons.support_agent_rounded, color: AppColors.goldLight, size: 22),
                    tooltip: 'تواصل معنا',
                  ),
                ),
              ],
            ),
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const DemoDataBanner(),
                  const SizedBox(height: 12),

                  // ── Hero Carousel ──
                  const _HeroCarousel(),
                  const SizedBox(height: 22),

                  // ── Premium Search Bar ──
                  const _PremiumSearchBar(),
                  const SizedBox(height: 28),

                  // ── Featured Cars ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: SectionHeader(
                      title: 'سيارات مميزة',
                      subtitle: 'أحدث وأفخم السيارات لدينا',
                      action: TextButton.icon(
                        onPressed: () => context.go('/cars'),
                        icon: const Icon(Icons.arrow_back_ios_rounded, size: 14),
                        label: const Text('عرض الكل'),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  AsyncView(
                    value: content,
                    isEmpty: (c) => c.featuredCars.isEmpty,
                    emptyMessage: 'لا توجد سيارات مميزة حالياً',
                    data: (c) => _FeaturedCarsStrip(cars: c.featuredCars),
                  ),
                  const SizedBox(height: 28),

                  // ── Brands ──
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: SectionHeader(title: 'تصفح حسب الماركة'),
                  ),
                  const SizedBox(height: 14),
                  AsyncView(
                    value: content,
                    isEmpty: (c) => c.brands.isEmpty,
                    emptyMessage: 'لا توجد ماركات',
                    data: (c) => _BrandStrip(brands: c.brands),
                  ),
                  const SizedBox(height: 28),

                  // ── Partner Banks ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: SectionHeader(
                      title: 'البنوك الشريكة',
                      subtitle: 'عروض التمويل من أفضل البنوك',
                      action: TextButton.icon(
                        onPressed: () => context.push('/banks'),
                        icon: const Icon(Icons.arrow_back_ios_rounded, size: 14),
                        label: const Text('العروض'),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  AsyncView(
                    value: banks,
                    isEmpty: (b) => b.isEmpty,
                    emptyMessage: 'لا توجد بنوك',
                    data: (b) => _BankStrip(banks: b),
                  ),
                  const SizedBox(height: 32),

                  // ── Why Us ──
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: _WhyUsAnimated(),
                  ),
                  const SizedBox(height: 28),

                  // ── Premium CTA ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: _PremiumCTA(onTap: () => context.go('/cars')),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED APP BAR TITLE with shimmer
// ═══════════════════════════════════════════════════════════════
class _AnimatedAppBarTitle extends StatefulWidget {
  const _AnimatedAppBarTitle();

  @override
  State<_AnimatedAppBarTitle> createState() => _AnimatedAppBarTitleState();
}

class _AnimatedAppBarTitleState extends State<_AnimatedAppBarTitle>
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
              colors: const [
                Color(0xFFFFD700),
                Color(0xFFFFF8DC),
                Color(0xFFFFD700),
              ],
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
            'ماكس موتورز',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: 0.5,
            ),
          ),
        );
      },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// HERO CAROUSEL — Taller, shimmer overlay, animated indicators
// ═══════════════════════════════════════════════════════════════
class _HeroCarousel extends StatefulWidget {
  const _HeroCarousel();

  @override
  State<_HeroCarousel> createState() => _HeroCarouselState();
}

class _HeroCarouselState extends State<_HeroCarousel>
    with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  final CarouselSliderController _controller = CarouselSliderController();
  late AnimationController _shimmerCtrl;

  @override
  void initState() {
    super.initState();
    _shimmerCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _shimmerCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final slides = [
      _SlideData(
        title: 'ماكس موتورز',
        subtitle: 'وجهتك الأولى لشراء وتمويل السيارات في المملكة',
        buttonText: 'احسب التمويل الآن',
        buttonIcon: Icons.calculate_rounded,
        gradientColors: [const Color(0xFF1C1A18), const Color(0xFF080706)],
        borderColor: const Color(0x33FFD700),
        icon: Icons.directions_car_filled_rounded,
        accentColor: const Color(0xFFFFD700),
        onTap: () => context.go('/finance'),
      ),
      _SlideData(
        title: 'أسطول السيارات الفاخرة',
        subtitle: 'تصفح أحدث وأفخم موديلات السيارات الحصرية بأسعار مميزة',
        buttonText: 'تصفح السيارات',
        buttonIcon: Icons.directions_car_rounded,
        gradientColors: [const Color(0xFF2C1C12), const Color(0xFF080706)],
        borderColor: AppColors.gold.withValues(alpha: 0.3),
        icon: Icons.auto_awesome_rounded,
        accentColor: AppColors.goldLight,
        onTap: () => context.go('/cars'),
      ),
      _SlideData(
        title: 'حلول تمويل مرنة',
        subtitle: 'شراكات مع كبرى البنوك السعودية وبأقل نسبة مرابحة',
        buttonText: 'عرض عروض البنوك',
        buttonIcon: Icons.account_balance_rounded,
        gradientColors: [const Color(0xFF122C2A), const Color(0xFF080706)],
        borderColor: AppColors.goldLight.withValues(alpha: 0.2),
        icon: Icons.monetization_on_rounded,
        accentColor: AppColors.goldPale,
        onTap: () => context.push('/banks'),
      ),
    ];

    return Column(
      children: [
        CarouselSlider(
          carouselController: _controller,
          items: slides.map((slide) => _buildSlide(context, slide)).toList(),
          options: CarouselOptions(
            height: 260,
            viewportFraction: 0.92,
            enlargeCenterPage: true,
            enlargeStrategy: CenterPageEnlargeStrategy.zoom,
            autoPlay: true,
            autoPlayInterval: const Duration(seconds: 6),
            autoPlayCurve: Curves.easeInOutCubic,
            onPageChanged: (index, reason) {
              setState(() {
                _currentIndex = index;
              });
            },
          ),
        ),
        const SizedBox(height: 14),
        // ── Premium animated indicators ──
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: slides.asMap().entries.map((entry) {
            final isActive = _currentIndex == entry.key;
            return GestureDetector(
              onTap: () => _controller.animateToPage(entry.key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeOutCubic,
                width: isActive ? 24.0 : 8.0,
                height: 8.0,
                margin: const EdgeInsets.symmetric(horizontal: 4.0),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  gradient: isActive
                      ? const LinearGradient(
                          colors: AppColors.goldButtonGradient,
                        )
                      : null,
                  color: isActive ? null : Colors.white.withValues(alpha: 0.2),
                  boxShadow: isActive
                      ? [
                          BoxShadow(
                            color: AppColors.gold.withValues(alpha: 0.4),
                            blurRadius: 8,
                            spreadRadius: 1,
                          ),
                        ]
                      : null,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildSlide(BuildContext context, _SlideData slide) {
    return AnimatedBuilder(
      animation: _shimmerCtrl,
      builder: (context, child) {
        return Container(
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              colors: slide.gradientColors,
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
            ),
            border: Border.all(
              color: slide.borderColor,
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: slide.accentColor.withValues(alpha: 0.08),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
                // Background icon
                Positioned(
                  left: -30,
                  bottom: -20,
                  child: Icon(
                    slide.icon,
                    size: 200,
                    color: slide.accentColor.withValues(alpha: 0.06),
                  ),
                ),
                // Shimmer overlay
                Positioned.fill(
                  child: ShaderMask(
                    shaderCallback: (bounds) {
                      return LinearGradient(
                        begin: Alignment(-1.0 + 3.0 * _shimmerCtrl.value, -0.3),
                        end: Alignment(-0.5 + 3.0 * _shimmerCtrl.value, 0.3),
                        colors: [
                          Colors.white.withValues(alpha: 0.0),
                          Colors.white.withValues(alpha: 0.03),
                          Colors.white.withValues(alpha: 0.0),
                        ],
                      ).createShader(bounds);
                    },
                    blendMode: BlendMode.srcOver,
                    child: Container(color: Colors.white.withValues(alpha: 0.01)),
                  ),
                ),
                // Content
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Small accent line
                      Container(
                        width: 32,
                        height: 3,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(2),
                          gradient: LinearGradient(
                            colors: [slide.accentColor, slide.accentColor.withValues(alpha: 0.3)],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      ShaderMask(
                        shaderCallback: (b) => LinearGradient(
                          colors: [slide.accentColor, slide.accentColor.withValues(alpha: 0.7)],
                        ).createShader(b),
                        child: Text(
                          slide.title,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            height: 1.2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        slide.subtitle,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 13,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 18),
                      GradientButton(
                        label: slide.buttonText,
                        icon: slide.buttonIcon,
                        expand: false,
                        onPressed: slide.onTap,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SlideData {
  _SlideData({
    required this.title,
    required this.subtitle,
    required this.buttonText,
    required this.buttonIcon,
    required this.gradientColors,
    required this.borderColor,
    required this.icon,
    required this.accentColor,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final String buttonText;
  final IconData buttonIcon;
  final List<Color> gradientColors;
  final Color borderColor;
  final IconData icon;
  final Color accentColor;
  final VoidCallback onTap;
}

// ═══════════════════════════════════════════════════════════════
// PREMIUM SEARCH BAR — gradient border on focus, elevated shadow
// ═══════════════════════════════════════════════════════════════
class _PremiumSearchBar extends ConsumerStatefulWidget {
  const _PremiumSearchBar();

  @override
  ConsumerState<_PremiumSearchBar> createState() => _PremiumSearchBarState();
}

class _PremiumSearchBarState extends ConsumerState<_PremiumSearchBar>
    with SingleTickerProviderStateMixin {
  final _textController = TextEditingController();
  final _focusNode = FocusNode();
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      setState(() => _isFocused = _focusNode.hasFocus);
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onSearch(String value) {
    if (value.trim().isEmpty) return;
    ref.read(carQueryProvider.notifier).state = CarQuery(
      search: value.trim(),
      page: 1,
      limit: 20,
    );
    context.go('/cars');
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: _isFocused
              ? LinearGradient(
                  colors: [
                    AppColors.gold.withValues(alpha: 0.3),
                    AppColors.goldPale.withValues(alpha: 0.15),
                    AppColors.gold.withValues(alpha: 0.3),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          boxShadow: _isFocused
              ? [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: 0.12),
                    blurRadius: 20,
                    spreadRadius: 2,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        padding: const EdgeInsets.all(1.5),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: 0.9),
            borderRadius: BorderRadius.circular(14.5),
            border: _isFocused
                ? null
                : Border.all(color: AppColors.border),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
          child: TextField(
            controller: _textController,
            focusNode: _focusNode,
            textInputAction: TextInputAction.search,
            onSubmitted: _onSearch,
            style: const TextStyle(color: Colors.white, fontSize: 15),
            decoration: InputDecoration(
              hintText: 'ابحث عن سيارة أحلامك...',
              hintStyle: const TextStyle(color: AppColors.mutedForeground, fontSize: 14),
              prefixIcon: AnimatedScale(
                scale: _isFocused ? 1.15 : 1.0,
                duration: const Duration(milliseconds: 200),
                child: const Icon(Icons.search_rounded, color: AppColors.gold, size: 22),
              ),
              suffixIcon: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_textController.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: AppColors.mutedForeground, size: 20),
                      onPressed: () {
                        setState(() {
                          _textController.clear();
                        });
                      },
                    ),
                  Container(
                    width: 1,
                    height: 20,
                    color: AppColors.border,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                  ),
                  const Icon(Icons.mic_none_rounded, color: AppColors.mutedForeground, size: 20),
                  const SizedBox(width: 4),
                ],
              ),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              filled: false,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onChanged: (text) {
              setState(() {});
            },
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// FEATURED CARS — with gradient fade hint
// ═══════════════════════════════════════════════════════════════
class _FeaturedCarsStrip extends StatelessWidget {
  const _FeaturedCarsStrip({required this.cars});
  final List cars;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 280,
      child: Stack(
        children: [
          ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: cars.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (_, i) => CarCard(car: cars[i], width: 240),
          ),
          // Left gradient fade (RTL scroll hint)
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            width: 24,
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      AppColors.background,
                      AppColors.background.withValues(alpha: 0),
                    ],
                  ),
                ),
              ),
            ),
          ),
          // Right gradient fade
          Positioned(
            right: 0,
            top: 0,
            bottom: 0,
            width: 24,
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerRight,
                    end: Alignment.centerLeft,
                    colors: [
                      AppColors.background,
                      AppColors.background.withValues(alpha: 0),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// BRAND STRIP — Circular logos with gold glow + animated scale
// ═══════════════════════════════════════════════════════════════
class _BrandStrip extends ConsumerWidget {
  const _BrandStrip({required this.brands});
  final List<FeaturedItem> brands;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SizedBox(
      height: 120,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: brands.length,
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemBuilder: (_, i) {
          final b = brands[i];
          return _BrandItem(
            brand: b,
            onTap: () {
              ref.read(carQueryProvider.notifier).state = CarQuery(
                make: b.name,
                page: 1,
                limit: 20,
              );
              context.go('/cars');
            },
          );
        },
      ),
    );
  }
}

class _BrandItem extends StatefulWidget {
  const _BrandItem({required this.brand, required this.onTap});
  final FeaturedItem brand;
  final VoidCallback onTap;

  @override
  State<_BrandItem> createState() => _BrandItemState();
}

class _BrandItemState extends State<_BrandItem> with SingleTickerProviderStateMixin {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.92 : 1.0,
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOutCubic,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withValues(alpha: 0.4),
                border: Border.all(
                  color: AppColors.gold.withValues(alpha: 0.35),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: 0.1),
                    blurRadius: 12,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: ClipOval(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: AppNetworkImage(
                    url: widget.brand.image,
                    width: 48,
                    height: 48,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: 80,
              child: Text(
                widget.brand.displayName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// BANK STRIP — Glassmorphism cards with shimmer
// ═══════════════════════════════════════════════════════════════
class _BankStrip extends StatelessWidget {
  const _BankStrip({required this.banks});
  final List<Bank> banks;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 110,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: banks.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (_, i) {
          final bank = banks[i];
          return _BankCard(bank: bank);
        },
      ),
    );
  }
}

class _BankCard extends StatefulWidget {
  const _BankCard({required this.bank});
  final Bank bank;

  @override
  State<_BankCard> createState() => _BankCardState();
}

class _BankCardState extends State<_BankCard> with SingleTickerProviderStateMixin {
  late AnimationController _shimmerCtrl;

  @override
  void initState() {
    super.initState();
    _shimmerCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 5),
    )..repeat();
  }

  @override
  void dispose() {
    _shimmerCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push('/banks'),
      borderRadius: BorderRadius.circular(18),
      child: AnimatedBuilder(
        animation: _shimmerCtrl,
        builder: (context, child) {
          return Container(
            width: 210,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.surfaceAlt.withValues(alpha: 0.8),
                  AppColors.surface.withValues(alpha: 0.6),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: AppColors.gold.withValues(alpha: 0.12),
                width: 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Stack(
              children: [
                // Shimmer highlight
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: ShaderMask(
                      shaderCallback: (bounds) {
                        return LinearGradient(
                          begin: Alignment(-1.0 + 3.0 * _shimmerCtrl.value, -0.3),
                          end: Alignment(-0.5 + 3.0 * _shimmerCtrl.value, 0.3),
                          colors: [
                            Colors.white.withValues(alpha: 0.0),
                            Colors.white.withValues(alpha: 0.02),
                            Colors.white.withValues(alpha: 0.0),
                          ],
                        ).createShader(bounds);
                      },
                      blendMode: BlendMode.srcOver,
                      child: Container(color: Colors.white.withValues(alpha: 0.005)),
                    ),
                  ),
                ),
                // Content
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.white.withValues(alpha: 0.05),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: AppNetworkImage(
                          url: widget.bank.logoImage,
                          width: 44,
                          height: 44,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.bank.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.gold.withValues(alpha: 0.15),
                                  AppColors.gold.withValues(alpha: 0.08),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: AppColors.gold.withValues(alpha: 0.2),
                                width: 0.5,
                              ),
                            ),
                            child: Text(
                              'نسبة ${widget.bank.interestRate}%',
                              style: const TextStyle(
                                color: AppColors.goldLight,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.arrow_back_ios_rounded,
                      size: 14,
                      color: AppColors.mutedForeground.withValues(alpha: 0.5),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// WHY US — Staggered entrance animation + gradient icon bg
// ═══════════════════════════════════════════════════════════════
class _WhyUsAnimated extends StatefulWidget {
  const _WhyUsAnimated();

  @override
  State<_WhyUsAnimated> createState() => _WhyUsAnimatedState();
}

class _WhyUsAnimatedState extends State<_WhyUsAnimated>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late List<Animation<double>> _fadeAnims;
  late List<Animation<Offset>> _slideAnims;

  static const _items = [
    ('تمويل إسلامي', 'متوافق مع الشريعة الإسلامية', Icons.verified_rounded),
    ('أفضل الأسعار', 'أسعار تنافسية بدون عمولات خفية', Icons.sell_rounded),
    ('ضمان موثوق', 'فحص شامل وحماية لسيارتك', Icons.shield_rounded),
    ('خدمة سريعة', 'إنهاء المعاملات وتسليم سريع', Icons.bolt_rounded),
  ];

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _fadeAnims = List.generate(
      _items.length,
      (i) => CurvedAnimation(
        parent: _ctrl,
        curve: Interval(i * 0.15, 0.4 + i * 0.15, curve: Curves.easeOut),
      ),
    );
    _slideAnims = List.generate(
      _items.length,
      (i) => Tween<Offset>(
        begin: const Offset(0, 0.3),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: _ctrl,
        curve: Interval(i * 0.15, 0.4 + i * 0.15, curve: Curves.easeOutCubic),
      )),
    );
    // Start animation after a brief delay
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) _ctrl.forward();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'لماذا ماكس موتورز؟'),
        const SizedBox(height: 14),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.6,
          children: _items.asMap().entries.map((entry) {
            final i = entry.key;
            final e = entry.value;
            return SlideTransition(
              position: _slideAnims[i],
              child: FadeTransition(
                opacity: _fadeAnims[i],
                child: _WhyUsCard(
                  title: e.$1,
                  subtitle: e.$2,
                  icon: e.$3,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _WhyUsCard extends StatelessWidget {
  const _WhyUsCard({
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.12),
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.gold.withValues(alpha: 0.04),
            blurRadius: 12,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [
                  AppColors.gold.withValues(alpha: 0.2),
                  AppColors.gold.withValues(alpha: 0.08),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.gold.withValues(alpha: 0.1),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Icon(icon, color: AppColors.gold, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    color: AppColors.mutedForeground.withValues(alpha: 0.9),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// PREMIUM CTA — Gold gradient border, shimmer, background icon
// ═══════════════════════════════════════════════════════════════
class _PremiumCTA extends StatefulWidget {
  const _PremiumCTA({required this.onTap});
  final VoidCallback onTap;

  @override
  State<_PremiumCTA> createState() => _PremiumCTAState();
}

class _PremiumCTAState extends State<_PremiumCTA>
    with SingleTickerProviderStateMixin {
  late AnimationController _shimmerCtrl;

  @override
  void initState() {
    super.initState();
    _shimmerCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _shimmerCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _shimmerCtrl,
      builder: (context, child) {
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              colors: [
                AppColors.gold.withValues(alpha: 0.3),
                AppColors.goldPale.withValues(alpha: 0.1),
                AppColors.gold.withValues(alpha: 0.3),
              ],
              stops: [
                (_shimmerCtrl.value - 0.3).clamp(0.0, 1.0),
                _shimmerCtrl.value,
                (_shimmerCtrl.value + 0.3).clamp(0.0, 1.0),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          padding: const EdgeInsets.all(1.5),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18.5),
            ),
            child: Stack(
              children: [
                Positioned(
                  left: -20,
                  bottom: -20,
                  child: Icon(
                    Icons.directions_car_rounded,
                    size: 120,
                    color: AppColors.gold.withValues(alpha: 0.04),
                  ),
                ),
                Column(
                  children: [
                    ShaderMask(
                      shaderCallback: (b) => const LinearGradient(
                        colors: AppColors.goldTextGradient,
                      ).createShader(b),
                      child: const Text(
                        'هل تبحث عن سيارة أحلامك؟',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 20,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'تصفح مجموعتنا الكاملة واحصل على أفضل عروض التمويل',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.mutedForeground.withValues(alpha: 0.9),
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 20),
                    GradientButton(
                      label: 'تصفح السيارات',
                      icon: Icons.directions_car_rounded,
                      onPressed: widget.onTap,
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
