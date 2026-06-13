import 'dart:ui';
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_state.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/launchers.dart';
import '../../core/widgets/connection_status_card.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);

    return Scaffold(
      body: Stack(
        children: [
          Positioned(
            top: -100,
            left: -100,
            child: ImageFiltered(
              imageFilter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
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
                    'المزيد',
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

              // ── Content ──
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _ProfileCard(
                      signedIn: auth.signedIn,
                      name: auth.displayName,
                      email: auth.email,
                      onSignInTap: () => context.push('/sign-in'),
                      onSignOutTap: () async {
                        if (AppConfig.hasClerk) {
                          try {
                            await ClerkAuth.of(context).signOut();
                          } catch (_) {}
                        }
                        // Clear the local state safely
                        ref.read(authStateProvider.notifier).state = const AuthSnapshot();
                      },
                    ),
                    const SizedBox(height: 14),
                    const ConnectionStatusCard(),
                    const SizedBox(height: 22),
                    
                    _MenuGroup(
                      title: 'استكشف المعرض',
                      tiles: [
                        _MenuTile(
                          icon: Icons.reviews_rounded,
                          label: 'آراء العملاء',
                          onTap: () => context.push('/reviews'),
                        ),
                        _MenuTile(
                          icon: Icons.account_balance_rounded,
                          label: 'البنوك الشريكة',
                          onTap: () => context.push('/banks'),
                        ),
                        _MenuTile(
                          icon: Icons.business_rounded,
                          label: 'الشركات',
                          onTap: () => context.push('/companies'),
                        ),
                        _MenuTile(
                          icon: Icons.article_rounded,
                          label: 'المقالات والأخبار',
                          onTap: () => context.push('/articles'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    
                    _MenuGroup(
                      title: 'حسابي والطلبات',
                      tiles: [
                        _MenuTile(
                          icon: Icons.receipt_long_rounded,
                          label: 'طلباتي وحجوزاتي',
                          onTap: () => context.push('/reservations'),
                        ),
                        _MenuTile(
                          icon: Icons.handshake_rounded,
                          label: 'طلب انضمام شركة المعرض',
                          onTap: () => context.push('/company-request'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    
                    _MenuGroup(
                      title: 'الدعم والمساعدة',
                      tiles: [
                        _MenuTile(
                          icon: Icons.support_agent_rounded,
                          label: 'تواصل معنا',
                          onTap: () => context.push('/contact'),
                        ),
                        _MenuTile(
                          icon: Icons.info_outline_rounded,
                          label: 'من نحن',
                          onTap: () => context.push('/about'),
                        ),
                        _MenuTile(
                          icon: Icons.chat_rounded,
                          label: 'المحادثة الفورية عبر واتساب',
                          color: const Color(0xFF25D366),
                          onTap: () =>
                              Launchers.whatsapp('مرحباً، أرغب بالاستفسار عن السيارات'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 36),
                    
                    Center(
                      child: Text(
                        'ماكس موتورز • ${AppConfig.apiBaseUrl.replaceAll('https://', '').replaceAll('http://', '')}',
                        style: const TextStyle(
                          color: AppColors.mutedForeground,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.signedIn,
    required this.onSignInTap,
    required this.onSignOutTap,
    this.name,
    this.email,
  });

  final bool signedIn;
  final String? name;
  final String? email;
  final VoidCallback onSignInTap;
  final VoidCallback onSignOutTap;

  @override
  Widget build(BuildContext context) {
    final initials = (name != null && name!.trim().isNotEmpty)
        ? name!.trim().split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : '?';

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.border,
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            color: AppColors.surface.withValues(alpha: 0.7),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Row(
              children: [
                // Avatar with gold gradient border ring
                Container(
                  padding: const EdgeInsets.all(2.5),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: AppColors.goldGradientBorder,
                    ),
                  ),
                  child: CircleAvatar(
                    radius: 28,
                    backgroundColor: AppColors.surfaceElevated,
                    child: Text(
                      initials,
                      style: const TextStyle(
                        color: AppColors.goldLight,
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                
                // Account text details & action button
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        signedIn ? (name ?? 'مرحباً بك') : 'تسجيل الدخول',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        signedIn
                            ? (email ?? 'حسابك في ماكس موتورز')
                            : 'سجّل الدخول لإدارة طلباتك ومراجعاتك الكودية',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.mutedForeground,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(width: 8),
                // Action Button (Sign In or Sign Out)
                if (!signedIn)
                  GestureDetector(
                    onTap: onSignInTap,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: const LinearGradient(
                          colors: AppColors.goldButtonGradient,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.goldGlow,
                            blurRadius: 8,
                            spreadRadius: 0.5,
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'دخول',
                            style: TextStyle(
                              color: Colors.black,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(
                            Icons.login_rounded,
                            color: Colors.black,
                            size: 14,
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  IconButton(
                    onPressed: onSignOutTap,
                    tooltip: 'تسجيل الخروج',
                    icon: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.destructive.withValues(alpha: 0.1),
                        border: Border.all(
                          color: AppColors.destructive.withValues(alpha: 0.2),
                        ),
                      ),
                      child: const Icon(
                        Icons.logout_rounded,
                        color: AppColors.destructive,
                        size: 18,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuGroup extends StatelessWidget {
  const _MenuGroup({required this.title, required this.tiles});

  final String title;
  final List<_MenuTile> tiles;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(right: 6, bottom: 8),
          child: Text(
            title,
            style: const TextStyle(
              color: AppColors.goldPale,
              fontWeight: FontWeight.w800,
              fontSize: 13,
              letterSpacing: 0.3,
            ),
          ),
        ),
        Material(
          color: AppColors.surface.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(16),
          clipBehavior: Clip.antiAlias,
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.border,
                  width: 0.8,
                ),
              ),
              child: Column(
                children: [
                  for (var i = 0; i < tiles.length; i++) ...[
                    tiles[i],
                    if (i != tiles.length - 1)
                      Divider(height: 1, color: AppColors.border, thickness: 0.8),
                  ],
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
        leading: Icon(icon, color: color ?? AppColors.gold, size: 22),
        title: Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: Colors.white,
          ),
        ),
        trailing: const Icon(
          Icons.chevron_left_rounded,
          color: AppColors.mutedForeground,
          size: 20,
        ),
        onTap: onTap,
      ),
    );
  }
}
