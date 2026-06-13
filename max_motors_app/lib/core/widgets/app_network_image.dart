import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Network image with consistent placeholder / error styling.
class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.height,
    this.width,
    this.borderRadius = 0,
  });

  final String? url;
  final BoxFit fit;
  final double? height;
  final double? width;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    Widget image;
    if (url == null || url!.isEmpty) {
      image = _placeholder(const Icon(Icons.directions_car,
          color: AppColors.mutedForeground, size: 40));
    } else {
      image = CachedNetworkImage(
        imageUrl: url!,
        fit: fit,
        height: height,
        width: width,
        placeholder: (_, __) => _placeholder(
          const Center(
            child: SizedBox(
              height: 22,
              width: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ),
        errorWidget: (_, __, ___) => _placeholder(
          const Icon(Icons.broken_image_outlined,
              color: AppColors.mutedForeground, size: 36),
        ),
      );
    }
    if (borderRadius > 0) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: image,
      );
    }
    return image;
  }

  Widget _placeholder(Widget child) => Container(
        height: height,
        width: width,
        color: AppColors.surfaceAlt,
        alignment: Alignment.center,
        child: child,
      );
}
