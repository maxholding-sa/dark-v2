import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/launchers.dart';
import '../../core/widgets/app_network_image.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/gradient_button.dart';
import '../../data/local/local_favorites.dart';
import '../../data/models/car.dart';
import '../../data/providers.dart';
import 'image_lightbox.dart';
import '../saved/saved_cars_screen.dart';

class CarDetailsScreen extends ConsumerStatefulWidget {
  const CarDetailsScreen({super.key, required this.carId});

  final String carId;

  @override
  ConsumerState<CarDetailsScreen> createState() => _CarDetailsScreenState();
}

class _CarDetailsScreenState extends ConsumerState<CarDetailsScreen> {
  bool? _saved;
  int _imageIndex = 0;
  late final PageController _pageController;
  bool _descriptionExpanded = false;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    LocalFavorites.instance.isSaved(widget.carId).then((v) {
      if (mounted) setState(() => _saved = v);
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _toggleSave() async {
    final now = await LocalFavorites.instance.toggle(widget.carId);
    if (!mounted) return;
    setState(() => _saved = now);
    ref.invalidate(savedCarsProvider);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(now ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final car = ref.watch(carByIdProvider(widget.carId));

    return Scaffold(
      body: AsyncView(
        value: car,
        onRetry: () => ref.invalidate(carByIdProvider(widget.carId)),
        data: (c) => _content(c),
      ),
    );
  }

  Widget _content(Car car) {
    return Stack(
      children: [
        CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ── Hero Image Gallery with Sliver App Bar ──
            SliverAppBar(
              expandedHeight: MediaQuery.of(context).size.width * 0.65,
              pinned: true,
              backgroundColor: AppColors.black,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                background: _heroGallery(car),
              ),
              leading: _appBarCircleButton(
                icon: Icons.arrow_back_rounded,
                onTap: () => Navigator.of(context).pop(),
              ),
              actions: [
                _appBarCircleButton(
                  icon: Icons.share_rounded,
                  onTap: () => Share.share('شاهد هذه السيارة في ماكس موتورز'),
                ),
                const SizedBox(width: 4),
                _appBarCircleButton(
                  icon: (_saved ?? false)
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  color: (_saved ?? false) ? AppColors.gold : Colors.white,
                  onTap: _saved == null ? null : _toggleSave,
                ),
                const SizedBox(width: 8),
              ],
            ),

            // ── Content ──
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 120),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Thumbnail strip
                    if (car.images.length > 1) ...[
                      _thumbnailStrip(car),
                      const SizedBox(height: 16),
                    ] else
                      const SizedBox(height: 18),

                    // ── Title & Price Header ──
                    _titleSection(car),
                    const SizedBox(height: 20),

                    // ── Specifications Grid ──
                    _sectionTitle('المواصفات', Icons.info_outline_rounded),
                    const SizedBox(height: 12),
                    _specsGrid(car),

                    // ── Description ──
                    if (car.description != null &&
                        car.description!.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      _sectionTitle('الوصف', Icons.description_rounded),
                      const SizedBox(height: 10),
                      _descriptionSection(car),
                    ],

                    // ── WhatsApp CTA ──
                    const SizedBox(height: 24),
                    _whatsappButton(car),
                  ],
                ),
              ),
            ),
          ],
        ),
        _bottomBar(car),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // APP BAR CIRCLE BUTTONS
  // ═══════════════════════════════════════════════════════════════
  Widget _appBarCircleButton({
    required IconData icon,
    Color? color,
    VoidCallback? onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.all(6),
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(50),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.45),
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.12),
                ),
              ),
              child: Icon(icon, color: color ?? Colors.white, size: 20),
            ),
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // HERO GALLERY — PageView with dot indicators
  // ═══════════════════════════════════════════════════════════════
  Widget _heroGallery(Car car) {
    if (car.images.isEmpty) {
      return const AppNetworkImage(url: null);
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        // PageView gallery
        PageView.builder(
          controller: _pageController,
          itemCount: car.images.length,
          onPageChanged: (i) => setState(() => _imageIndex = i),
          itemBuilder: (_, i) => GestureDetector(
            onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) =>
                  ImageLightbox(images: car.images, initialIndex: i),
            )),
            child: AppNetworkImage(url: car.images[i]),
          ),
        ),

        // Bottom gradient overlay
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          height: 80,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                colors: [
                  AppColors.background,
                  AppColors.background.withValues(alpha: 0),
                ],
              ),
            ),
          ),
        ),

        // Dot indicators
        if (car.images.length > 1)
          Positioned(
            bottom: 12,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(car.images.length, (i) {
                final isActive = i == _imageIndex;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOutCubic,
                  width: isActive ? 20 : 6,
                  height: 6,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(3),
                    gradient: isActive
                        ? const LinearGradient(
                            colors: AppColors.goldButtonGradient,
                          )
                        : null,
                    color: isActive ? null : Colors.white.withValues(alpha: 0.3),
                    boxShadow: isActive
                        ? [
                            BoxShadow(
                              color: AppColors.goldGlow,
                              blurRadius: 6,
                              spreadRadius: 1,
                            ),
                          ]
                        : null,
                  ),
                );
              }),
            ),
          ),

        // Image counter badge
        if (car.images.length > 1)
          Positioned(
            top: MediaQuery.of(context).padding.top + 52,
            left: 14,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.photo_library_rounded, color: Colors.white70, size: 13),
                      const SizedBox(width: 4),
                      Text(
                        '${_imageIndex + 1}/${car.images.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // THUMBNAIL STRIP
  // ═══════════════════════════════════════════════════════════════
  Widget _thumbnailStrip(Car car) {
    return SizedBox(
      height: 64,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: car.images.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) => GestureDetector(
          onTap: () {
            setState(() => _imageIndex = i);
            _pageController.animateToPage(
              i,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
            );
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 80,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: i == _imageIndex
                    ? AppColors.gold
                    : Colors.transparent,
                width: 2,
              ),
              boxShadow: i == _imageIndex
                  ? [
                      BoxShadow(
                        color: AppColors.goldGlow,
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                    ]
                  : null,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: AppNetworkImage(url: car.images[i]),
            ),
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // TITLE & PRICE SECTION
  // ═══════════════════════════════════════════════════════════════
  Widget _titleSection(Car car) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          car.title,
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            height: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        // Year and color pills
        Row(
          children: [
            _infoPill('${car.year}', Icons.calendar_today_rounded),
            if (car.color != null && car.color!.isNotEmpty) ...[
              const SizedBox(width: 8),
              _infoPill(car.color!, Icons.palette_rounded),
            ],
            if (car.bodyType != null && car.bodyType!.isNotEmpty) ...[
              const SizedBox(width: 8),
              _infoPill(car.bodyType!, Icons.directions_car_rounded),
            ],
          ],
        ),
        const SizedBox(height: 14),
        // Price with shimmer
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: AppColors.goldTextGradient,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ).createShader(bounds),
          child: Text(
            Formatters.sar(car.price),
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
        ),
      ],
    );
  }

  Widget _infoPill(String text, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.15),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.goldLight),
          const SizedBox(width: 5),
          Text(
            text,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION TITLE
  // ═══════════════════════════════════════════════════════════════
  Widget _sectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Container(
          width: 3,
          height: 20,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(2),
            gradient: const LinearGradient(
              colors: AppColors.goldButtonGradient,
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Icon(icon, color: AppColors.gold, size: 18),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.2,
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SPECS GRID — premium glass cards
  // ═══════════════════════════════════════════════════════════════
  Widget _specsGrid(Car car) {
    final specs = <(IconData, String, String?)>[
      (Icons.calendar_today_rounded, 'السنة', '${car.year}'),
      (Icons.speed_rounded, 'الممشى',
          car.mileage != null ? Formatters.mileage(car.mileage) : null),
      (Icons.local_gas_station_rounded, 'الوقود', car.fuelType),
      (Icons.settings_rounded, 'ناقل الحركة', car.transmission),
      (Icons.directions_car_rounded, 'الهيكل', car.bodyType),
      (Icons.event_seat_rounded, 'المقاعد',
          car.seats != null ? '${car.seats}' : null),
      (Icons.palette_rounded, 'اللون', car.color),
      (Icons.drive_eta_rounded, 'الدفع', car.driveType),
    ].where((e) => e.$3 != null && e.$3!.isNotEmpty).toList();

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 2.8,
      children: specs.map((s) => _specCard(s.$1, s.$2, s.$3!)).toList(),
    );
  }

  Widget _specCard(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.1),
          width: 0.8,
        ),
      ),
      child: Row(
        children: [
          // Gold icon circle
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: AppColors.gold.withValues(alpha: 0.15),
              ),
            ),
            child: Icon(icon, color: AppColors.gold, size: 17),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 10,
                    color: AppColors.mutedForeground.withValues(alpha: 0.7),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // DESCRIPTION — expandable
  // ═══════════════════════════════════════════════════════════════
  Widget _descriptionSection(Car car) {
    final text = car.description!;
    final isLong = text.length > 200;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.border,
          width: 0.6,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AnimatedCrossFade(
            firstChild: Text(
              text,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                height: 1.7,
                color: Colors.white70,
                fontSize: 13,
              ),
            ),
            secondChild: Text(
              text,
              style: const TextStyle(
                height: 1.7,
                color: Colors.white70,
                fontSize: 13,
              ),
            ),
            crossFadeState: _descriptionExpanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 250),
          ),
          if (isLong) ...[
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => setState(() => _descriptionExpanded = !_descriptionExpanded),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _descriptionExpanded ? 'عرض أقل' : 'عرض المزيد',
                    style: const TextStyle(
                      color: AppColors.goldLight,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    _descriptionExpanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: AppColors.goldLight,
                    size: 16,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // WHATSAPP BUTTON
  // ═══════════════════════════════════════════════════════════════
  Widget _whatsappButton(Car car) {
    return GestureDetector(
      onTap: () => Launchers.whatsapp(
          'مرحباً، أرغب بالاستفسار عن ${car.title} (${car.year})'),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFF25D366).withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: const Color(0xFF25D366).withValues(alpha: 0.3),
            width: 0.8,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF25D366).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.chat_rounded, color: Color(0xFF25D366), size: 18),
            ),
            const SizedBox(width: 10),
            const Text(
              'استفسر عبر واتساب',
              style: TextStyle(
                color: Color(0xFF25D366),
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // BOTTOM ACTION BAR — frosted glass
  // ═══════════════════════════════════════════════════════════════
  Widget _bottomBar(Car car) {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: BoxDecoration(
              color: AppColors.black.withValues(alpha: 0.8),
              border: Border(
                top: BorderSide(
                  color: AppColors.gold.withValues(alpha: 0.25),
                  width: 0.8,
                ),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  if (car.testDriveAvailable)
                    Expanded(
                      child: _outlinedActionButton(
                        label: 'قيادة تجريبية',
                        icon: Icons.drive_eta_rounded,
                        onTap: () => context.push('/test-drive/${car.id}'),
                      ),
                    ),
                  if (car.testDriveAvailable) const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: GradientButton(
                      label: 'تقديم طلب تمويل',
                      icon: Icons.account_balance_rounded,
                      onPressed: () => context.push('/loan-request/${car.id}'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _outlinedActionButton({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: AppColors.gold.withValues(alpha: 0.5),
            width: 1.2,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppColors.gold, size: 18),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.gold,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
