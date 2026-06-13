import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../data/models/car.dart';

class CarCard extends StatefulWidget {
  const CarCard({
    super.key,
    required this.car,
    this.width,
    this.isListView = false,
  });

  final Car car;
  final double? width;
  final bool isListView;

  @override
  State<CarCard> createState() => _CarCardState();
}

class _CarCardState extends State<CarCard> with SingleTickerProviderStateMixin {
  bool _pressed = false;

  String _formatTransmission(String? t) {
    if (t == null) return '';
    final lower = t.toLowerCase();
    if (lower.contains('auto')) return 'أوتوماتيك';
    if (lower.contains('manual')) return 'عادي';
    return t;
  }

  String _formatFuelType(String? f) {
    if (f == null) return '';
    final lower = f.toLowerCase();
    if (lower.contains('petrol') || lower.contains('gas')) return 'بنزين';
    if (lower.contains('diesel')) return 'ديزل';
    if (lower.contains('hybrid')) return 'هجين';
    if (lower.contains('electric') || lower.contains('ev')) return 'كهرباء';
    return f;
  }

  String _formatMileage(int? m) {
    if (m == null) return '';
    if (m == 0) return 'جديدة';
    if (m < 1000) return '$m كم';
    final double thousands = m / 1000.0;
    if (thousands >= 1.0) {
      return '${thousands.toStringAsFixed(thousands % 1 == 0 ? 0 : 1)}k كم';
    }
    return '$m كم';
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      child: widget.isListView ? _buildListCard(context) : _buildGridCard(context),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LIST VIEW CARD — Horizontal layout
  // ═══════════════════════════════════════════════════════════════
  Widget _buildListCard(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        context.push('/cars/${widget.car.id}');
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOutCubic,
        child: Container(
          height: 140,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: widget.car.featured
                  ? AppColors.gold.withValues(alpha: 0.3)
                  : AppColors.border,
              width: widget.car.featured ? 1.2 : 0.8,
            ),
            boxShadow: [
              BoxShadow(
                color: widget.car.featured
                    ? AppColors.goldGlow
                    : AppColors.cardShadow,
                blurRadius: widget.car.featured ? 16 : 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Row(
            children: [
              // ── Image Section ──
              SizedBox(
                width: 150,
                height: 140,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppNetworkImage(url: widget.car.primaryImage),
                    // Gradient overlay on right edge for smooth blend
                    Positioned(
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 30,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.centerRight,
                            end: Alignment.centerLeft,
                            colors: [
                              AppColors.surface,
                              AppColors.surface.withValues(alpha: 0),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Badges
                    if (widget.car.featured)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: _premiumBadge('مميزة', AppColors.gold),
                      ),
                    if (widget.car.isLuxury)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: _premiumBadge('فاخرة', AppColors.bronze),
                      ),
                  ],
                ),
              ),
              // ── Content Section ──
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Title + subtitle
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.car.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${widget.car.year} • ${widget.car.bodyType ?? ''}',
                            style: TextStyle(
                              color: AppColors.mutedForeground.withValues(alpha: 0.8),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                      // Spec badges row
                      Row(
                        children: [
                          if (widget.car.transmission != null && widget.car.transmission!.isNotEmpty)
                            _specBadge(Icons.settings_suggest_rounded, _formatTransmission(widget.car.transmission)),
                          if (widget.car.fuelType != null && widget.car.fuelType!.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            _specBadge(Icons.local_gas_station_rounded, _formatFuelType(widget.car.fuelType)),
                          ],
                          if (widget.car.mileage != null) ...[
                            const SizedBox(width: 6),
                            _specBadge(Icons.speed_rounded, _formatMileage(widget.car.mileage)),
                          ],
                        ],
                      ),
                      // Price
                      _priceTag(widget.car.price),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GRID VIEW CARD — Vertical layout
  // ═══════════════════════════════════════════════════════════════
  Widget _buildGridCard(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        context.push('/cars/${widget.car.id}');
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOutCubic,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: widget.car.featured
                  ? AppColors.gold.withValues(alpha: 0.3)
                  : AppColors.border,
              width: widget.car.featured ? 1.2 : 0.8,
            ),
            boxShadow: [
              BoxShadow(
                color: widget.car.featured
                    ? AppColors.goldGlow
                    : AppColors.cardShadow,
                blurRadius: widget.car.featured ? 16 : 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Image with overlays ──
              Stack(
                children: [
                  AspectRatio(
                    aspectRatio: 16 / 10,
                    child: AppNetworkImage(url: widget.car.primaryImage),
                  ),
                  // Bottom gradient overlay for text readability
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 40,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [
                            AppColors.surface,
                            AppColors.surface.withValues(alpha: 0),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Top gold accent line
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 2,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: widget.car.featured
                              ? AppColors.goldButtonGradient
                              : [
                                  AppColors.gold.withValues(alpha: 0.4),
                                  AppColors.gold.withValues(alpha: 0.1),
                                ],
                        ),
                      ),
                    ),
                  ),
                  // Badges
                  if (widget.car.featured)
                    Positioned(
                      top: 10,
                      right: 10,
                      child: _premiumBadge('مميزة', AppColors.gold),
                    ),
                  if (widget.car.isLuxury)
                    Positioned(
                      top: 10,
                      left: 10,
                      child: _premiumBadge('فاخرة', AppColors.bronze),
                    ),
                ],
              ),
              // ── Content ──
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Title + year
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.car.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${widget.car.year} • ${widget.car.bodyType ?? ''}',
                            style: TextStyle(
                              color: AppColors.mutedForeground.withValues(alpha: 0.8),
                              fontSize: 10.5,
                            ),
                          ),
                        ],
                      ),
                      // Spec badges row
                      Row(
                        children: [
                          if (widget.car.transmission != null && widget.car.transmission!.isNotEmpty)
                            Expanded(
                              child: _specBadge(Icons.settings_suggest_rounded, _formatTransmission(widget.car.transmission), compact: true),
                            ),
                          const SizedBox(width: 4),
                          if (widget.car.mileage != null)
                            Expanded(
                              child: _specBadge(Icons.speed_rounded, _formatMileage(widget.car.mileage), compact: true),
                            ),
                        ],
                      ),
                      // Price
                      _priceTag(widget.car.price, compact: true),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SHARED COMPONENTS
  // ═══════════════════════════════════════════════════════════════

  /// Gold gradient price tag
  Widget _priceTag(double price, {bool compact = false}) {
    return ShaderMask(
      shaderCallback: (bounds) => const LinearGradient(
        colors: AppColors.goldTextGradient,
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(bounds),
      child: Text(
        Formatters.sar(price),
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w900,
          fontSize: compact ? 14 : 16,
        ),
      ),
    );
  }

  /// Premium spec badge with gold icon
  Widget _specBadge(IconData icon, String label, {bool compact = false}) {
    if (label.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 5 : 7, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.12),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: compact ? 11 : 13, color: AppColors.goldLight),
          const SizedBox(width: 3),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: AppColors.mutedForeground,
                fontSize: compact ? 9 : 10.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Glassmorphism badge with backdrop blur
  Widget _premiumBadge(String text, Color color) => ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.75),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: color.withValues(alpha: 0.5), width: 0.8),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.25),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 10,
              letterSpacing: 0.3,
            ),
          ),
        ),
      );
}
