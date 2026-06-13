import 'package:flutter/material.dart';

/// Color palette ported from the web app `src/app/globals.css` (.dark theme),
/// the primary look of ماكس موتورز: gold-on-black.
class AppColors {
  const AppColors._();

  // Backgrounds
  static const Color black = Color(0xFF080706);
  static const Color background = Color(0xFF080706);
  static const Color surface = Color(0xFF121110);
  static const Color surfaceAlt = Color(0xFF1C1A18);
  static const Color surfaceElevated = Color(0xFF242220);
  static const Color sidebar = Color(0xFF0A0908);

  // Gold accents
  static const Color gold = Color(0xFFB8860B); // dark goldenrod
  static const Color goldLight = Color(0xFFDAA520);
  static const Color goldPale = Color(0xFFF0E68C);
  static const Color bronze = Color(0xFFA0522D);
  static const Color saddle = Color(0xFF8B4513);

  // Foreground
  static const Color white = Color(0xFFFFFFFF);
  static const Color mutedForeground = Color(0xFFB0B0B0);

  static const Color destructive = Color(0xFFFF1A1A);

  // Borders
  static Color border = Colors.white.withValues(alpha: 0.10);
  static Color inputFill = Colors.white.withValues(alpha: 0.06);

  // Glow / Shadow colors
  static Color goldGlow = const Color(0xFFFFD700).withValues(alpha: 0.18);
  static Color cardShadow = Colors.black.withValues(alpha: 0.35);

  // Gradients
  static const List<Color> goldButtonGradient = [
    Color(0xFFFFD700),
    Color(0xFFFFE55C),
  ];
  static const List<Color> goldTextGradient = [
    Color(0xFFFFD700),
    Color(0xFFFFF8DC),
  ];
  static const List<Color> goldGradientBorder = [
    Color(0x4DFFD700),
    Color(0x26F0E68C),
    Color(0x4DFFD700),
  ];
  static const List<Color> shimmerGold = [
    Color(0xFFFFD700),
    Color(0xFFFFF8DC),
    Color(0xFFFFD700),
  ];
}
