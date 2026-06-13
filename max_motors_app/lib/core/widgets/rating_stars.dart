import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class RatingStars extends StatelessWidget {
  const RatingStars({super.key, required this.rating, this.size = 18});

  final int rating;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        return Icon(
          i < rating ? Icons.star_rounded : Icons.star_outline_rounded,
          color: AppColors.gold,
          size: size,
        );
      }),
    );
  }
}

/// Interactive star selector for the review form.
class RatingSelector extends StatelessWidget {
  const RatingSelector({
    super.key,
    required this.rating,
    required this.onChanged,
  });

  final int rating;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        return IconButton(
          onPressed: () => onChanged(i + 1),
          icon: Icon(
            i < rating ? Icons.star_rounded : Icons.star_outline_rounded,
            color: AppColors.gold,
            size: 30,
          ),
        );
      }),
    );
  }
}
