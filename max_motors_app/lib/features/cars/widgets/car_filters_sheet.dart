import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../data/models/car_filters.dart';
import '../../../data/providers.dart';

/// Bottom sheet for filtering car listings (make / body / fuel / transmission /
/// price / sort) mirroring the web `CarFilters`.
class CarFiltersSheet extends ConsumerStatefulWidget {
  const CarFiltersSheet({super.key});

  @override
  ConsumerState<CarFiltersSheet> createState() => _CarFiltersSheetState();
}

class _CarFiltersSheetState extends ConsumerState<CarFiltersSheet> {
  late CarQuery _draft;
  RangeValues? _price;

  @override
  void initState() {
    super.initState();
    _draft = ref.read(carQueryProvider);
  }

  @override
  Widget build(BuildContext context) {
    final options = ref.watch(carFiltersProvider);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (context, controller) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surface.withValues(alpha: 0.97),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(
                  top: BorderSide(
                    color: AppColors.gold.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
              ),
              child: options.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text(e.toString())),
                data: (opt) {
                  final min = opt.minPrice;
                  final max = opt.maxPrice <= min ? min + 100000 : opt.maxPrice;
                  _price ??= RangeValues(
                    _draft.minPrice ?? min,
                    _draft.maxPrice ?? max,
                  );
                  return ListView(
                    controller: controller,
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    children: [
                      // ── Drag Handle ──
                      Center(
                        child: Container(
                          margin: const EdgeInsets.only(top: 12, bottom: 20),
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(2),
                            gradient: const LinearGradient(
                              colors: AppColors.goldButtonGradient,
                            ),
                          ),
                        ),
                      ),

                      // ── Header Row ──
                      Row(
                        children: [
                          // Gold accent icon
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: AppColors.gold.withValues(alpha: 0.2),
                              ),
                            ),
                            child: const Icon(Icons.tune_rounded, color: AppColors.gold, size: 20),
                          ),
                          const SizedBox(width: 12),
                          ShaderMask(
                            shaderCallback: (bounds) => const LinearGradient(
                              colors: AppColors.goldTextGradient,
                            ).createShader(bounds),
                            child: const Text(
                              'تصفية النتائج',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const Spacer(),
                          // Clear button
                          _clearButton(() {
                            setState(() {
                              _draft = const CarQuery();
                              _price = RangeValues(min, max);
                            });
                          }),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // ── Dropdowns ──
                      _premiumDropdown(
                        label: 'الماركة',
                        icon: Icons.directions_car_rounded,
                        value: _draft.make,
                        items: opt.makes,
                        onChanged: (v) =>
                            setState(() => _draft = _draft.copyWith(make: v)),
                      ),
                      _premiumDropdown(
                        label: 'نوع الهيكل',
                        icon: Icons.car_rental_rounded,
                        value: _draft.bodyType,
                        items: opt.bodyTypes,
                        onChanged: (v) =>
                            setState(() => _draft = _draft.copyWith(bodyType: v)),
                      ),
                      _premiumDropdown(
                        label: 'نوع الوقود',
                        icon: Icons.local_gas_station_rounded,
                        value: _draft.fuelType,
                        items: opt.fuelTypes,
                        onChanged: (v) =>
                            setState(() => _draft = _draft.copyWith(fuelType: v)),
                      ),
                      _premiumDropdown(
                        label: 'ناقل الحركة',
                        icon: Icons.settings_rounded,
                        value: _draft.transmission,
                        items: opt.transmissions,
                        onChanged: (v) => setState(
                            () => _draft = _draft.copyWith(transmission: v)),
                      ),

                      const SizedBox(height: 20),

                      // ── Price Range Section ──
                      _sectionLabel('نطاق السعر', Icons.payments_rounded),
                      const SizedBox(height: 8),
                      // Price label pills
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _pricePill(Formatters.sar(_price!.start)),
                          Container(
                            width: 20,
                            height: 1,
                            color: AppColors.gold.withValues(alpha: 0.3),
                          ),
                          _pricePill(Formatters.sar(_price!.end)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SliderTheme(
                        data: SliderThemeData(
                          activeTrackColor: AppColors.gold,
                          inactiveTrackColor: AppColors.surfaceAlt,
                          thumbColor: AppColors.goldLight,
                          overlayColor: AppColors.gold.withValues(alpha: 0.15),
                          trackHeight: 4,
                          thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
                          overlayShape: const RoundSliderOverlayShape(overlayRadius: 18),
                          rangeThumbShape: const RoundRangeSliderThumbShape(enabledThumbRadius: 8),
                          rangeTrackShape: const RoundedRectRangeSliderTrackShape(),
                        ),
                        child: RangeSlider(
                          values: _price!,
                          min: min,
                          max: max,
                          divisions: 20,
                          onChanged: (v) => setState(() => _price = v),
                        ),
                      ),
                      // Min/Max labels
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            Formatters.number(min),
                            style: TextStyle(
                              fontSize: 10,
                              color: AppColors.mutedForeground.withValues(alpha: 0.6),
                            ),
                          ),
                          Text(
                            Formatters.number(max),
                            style: TextStyle(
                              fontSize: 10,
                              color: AppColors.mutedForeground.withValues(alpha: 0.6),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // ── Sort Section ──
                      _sectionLabel('الترتيب', Icons.sort_rounded),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(child: _sortChip('الأحدث', 'newest', Icons.schedule_rounded)),
                          const SizedBox(width: 8),
                          Expanded(child: _sortChip('الأقل سعراً', 'priceAsc', Icons.trending_down_rounded)),
                          const SizedBox(width: 8),
                          Expanded(child: _sortChip('الأعلى سعراً', 'priceDesc', Icons.trending_up_rounded)),
                        ],
                      ),

                      const SizedBox(height: 28),

                      // ── Apply Button ──
                      GradientButton(
                        label: 'عرض النتائج',
                        icon: Icons.search_rounded,
                        onPressed: () {
                          final applied = _draft.copyWith(
                            minPrice: _price!.start,
                            maxPrice: _price!.end,
                            page: 1,
                            limit: 20,
                          );
                          ref.read(carQueryProvider.notifier).state = applied;
                          Navigator.of(context).pop();
                        },
                      ),
                      const SizedBox(height: 12),
                    ],
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPONENTS
  // ═══════════════════════════════════════════════════════════════

  Widget _sectionLabel(String text, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.gold, size: 16),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 14,
            color: AppColors.white,
          ),
        ),
      ],
    );
  }

  Widget _pricePill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.2),
          width: 0.8,
        ),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 12,
          color: AppColors.goldLight,
        ),
      ),
    );
  }

  Widget _clearButton(VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: AppColors.mutedForeground.withValues(alpha: 0.3),
            width: 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.refresh_rounded, size: 14, color: AppColors.mutedForeground.withValues(alpha: 0.7)),
            const SizedBox(width: 4),
            Text(
              'مسح الكل',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.mutedForeground.withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sortChip(String label, String value, IconData icon) {
    final selected = _draft.sortBy == value;
    return GestureDetector(
      onTap: () => setState(() => _draft = _draft.copyWith(sortBy: value)),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: selected
              ? const LinearGradient(colors: AppColors.goldButtonGradient)
              : null,
          color: selected ? null : AppColors.surfaceAlt,
          border: selected
              ? null
              : Border.all(color: AppColors.border, width: 0.8),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: AppColors.goldGlow,
                    blurRadius: 12,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 14,
              color: selected ? AppColors.black : AppColors.mutedForeground,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: selected ? AppColors.black : AppColors.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _premiumDropdown({
    required String label,
    required IconData icon,
    required String value,
    required List<String> items,
    required ValueChanged<String> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: value.isNotEmpty
                ? AppColors.gold.withValues(alpha: 0.25)
                : AppColors.border,
            width: 0.8,
          ),
        ),
        child: DropdownButtonFormField<String>(
          value: value.isEmpty ? null : value,
          decoration: InputDecoration(
            labelText: label,
            labelStyle: TextStyle(
              color: AppColors.mutedForeground.withValues(alpha: 0.8),
              fontSize: 13,
            ),
            prefixIcon: Container(
              margin: const EdgeInsets.all(10),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: AppColors.gold, size: 16),
            ),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: const EdgeInsets.only(left: 12, right: 12),
          ),
          isExpanded: true,
          dropdownColor: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(14),
          style: const TextStyle(color: AppColors.white, fontSize: 14),
          items: [
            const DropdownMenuItem(value: '', child: Text('الكل')),
            ...items.map((e) => DropdownMenuItem(value: e, child: Text(e))),
          ],
          onChanged: (v) => onChanged(v ?? ''),
        ),
      ),
    );
  }
}
