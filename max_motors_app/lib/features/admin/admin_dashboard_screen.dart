import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_state.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/section_header.dart';

/// Shows the admin entry points, but only after confirming the signed-in user
/// has the ADMIN role via [isAdminProvider]. Non-admins see an access notice.
class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAdmin = ref.watch(isAdminProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('لوحة التحكم')),
      body: AsyncView(
        value: isAdmin,
        onRetry: () => ref.invalidate(isAdminProvider),
        data: (admin) => admin ? const _Dashboard() : const _AccessDenied(),
      ),
    );
  }
}

class _Dashboard extends StatelessWidget {
  const _Dashboard();

  @override
  Widget build(BuildContext context) {
    const tiles = <(IconData, String, String)>[
      (Icons.account_balance_rounded, 'البنوك', '/admin/banks'),
      (Icons.mail_rounded, 'رسائل التواصل', '/admin/contacts'),
      (Icons.reviews_rounded, 'المراجعات', '/admin/reviews'),
      (Icons.request_quote_rounded, 'طلبات التمويل', '/admin/loan-requests'),
    ];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(
          title: 'الإدارة',
          subtitle: 'إدارة محتوى وطلبات ماكس موتورز',
        ),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.2,
          children: tiles
              .map((t) => GlassCard(
                    onTap: () => context.push(t.$3),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(t.$1, color: AppColors.gold, size: 34),
                        const SizedBox(height: 10),
                        Text(t.$2,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ))
              .toList(),
        ),
      ],
    );
  }
}

class _AccessDenied extends StatelessWidget {
  const _AccessDenied();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.admin_panel_settings_outlined,
                color: AppColors.mutedForeground, size: 56),
            const SizedBox(height: 16),
            const Text('صلاحيات غير كافية',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text(
              'هذه الصفحة مخصصة للمشرفين فقط. سجّل الدخول بحساب مشرف للوصول.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.mutedForeground, height: 1.6),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => context.push('/sign-in'),
              child: const Text('تسجيل الدخول'),
            ),
          ],
        ),
      ),
    );
  }
}
