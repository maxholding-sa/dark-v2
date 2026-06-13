import 'dart:ui';
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/gradient_button.dart';

class SignInScreen extends StatelessWidget {
  const SignInScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final hasClerk = AppConfig.hasClerk;

    return Scaffold(
      body: Stack(
        children: [
          Positioned(
            top: -80,
            right: -80,
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
          
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // ── Frosted Glass AppBar ──
              SliverAppBar(
                pinned: true,
                backgroundColor: Colors.transparent,
                elevation: 0,
                scrolledUnderElevation: 0,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                  onPressed: () => context.pop(),
                ),
                centerTitle: true,
                title: ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: AppColors.goldTextGradient,
                  ).createShader(bounds),
                  child: const Text(
                    'تسجيل الدخول',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                    ),
                  ),
                ),
                flexibleSpace: ClipRRect(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                    child: Container(
                      color: AppColors.black.withValues(alpha: 0.75),
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

              // ── Body Content ──
              SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 400),
                      child: hasClerk ? const _ClerkBody() : const _AuthUnavailable(),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ClerkBody extends StatelessWidget {
  const _ClerkBody();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        ClerkSignedIn(
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: AppColors.gold.withValues(alpha: 0.25),
                width: 0.8,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  color: AppColors.surface.withValues(alpha: 0.6),
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.gold.withValues(alpha: 0.1),
                        ),
                        child: const Icon(
                          Icons.verified_user_rounded,
                          color: AppColors.goldLight,
                          size: 48,
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Text(
                        'تم تسجيل الدخول بنجاح',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'مرحباً بك مجدداً في تطبيق ماكس موتورز',
                        style: TextStyle(
                          color: AppColors.mutedForeground,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 24),
                      const ClerkUserButton(),
                      const SizedBox(height: 28),
                      GradientButton(
                        label: 'الذهاب للرئيسية',
                        onPressed: () => context.go('/'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        ClerkSignedOut(
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border, width: 0.8),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  color: AppColors.surface.withValues(alpha: 0.5),
                  padding: const EdgeInsets.all(20),
                  child: const ClerkAuthentication(),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AuthUnavailable extends StatelessWidget {
  const _AuthUnavailable();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.border,
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 15,
            spreadRadius: 2,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            color: AppColors.surface.withValues(alpha: 0.6),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.gold.withValues(alpha: 0.1),
                  ),
                  child: const Icon(
                    Icons.lock_outline_rounded,
                    color: AppColors.gold,
                    size: 40,
                  ),
                ),
                const SizedBox(height: 20),
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: AppColors.goldTextGradient,
                  ).createShader(bounds),
                  child: const Text(
                    'تسجيل الدخول غير مفعّل',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  kIsWeb
                      ? 'يمكنك تصفّح السيارات وعروض التمويل من المتصفح مباشرة. '
                          'بينما يتوفر تسجيل الدخول بشكل كامل في تطبيقات الجوال.'
                      : 'يمكنك تصفّح المعرض وعروض التمويل المتنوعة بدون الحاجة لحساب. '
                          'لتفعيل نظام تسجيل الدخول يرجى إعداد Clerk Publishable Key.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.mutedForeground,
                    fontSize: 13,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 28),
                GradientButton(
                  label: 'متابعة التصفح الآن',
                  onPressed: () => context.go('/'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
