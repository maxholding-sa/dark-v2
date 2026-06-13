import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/launchers.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../data/repositories/admin_repository.dart';
import '../../data/providers.dart';

class AdminContactsScreen extends ConsumerWidget {
  const AdminContactsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contacts = ref.watch(adminContactsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('رسائل التواصل')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(adminContactsProvider),
        child: AsyncView(
          value: contacts,
          isEmpty: (list) => list.isEmpty,
          emptyMessage: 'لا توجد رسائل',
          emptyIcon: Icons.mark_email_read_outlined,
          onRetry: () => ref.invalidate(adminContactsProvider),
          data: (list) => ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) =>
                _ContactCard(message: list[i], ref: ref),
          ),
        ),
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({required this.message, required this.ref});
  final ContactMessage message;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(message.subject.isEmpty ? '(بدون موضوع)' : message.subject,
                    style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
              if (message.createdAt != null)
                Text(Formatters.dateArabic(message.createdAt),
                    style: const TextStyle(
                        color: AppColors.mutedForeground, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 6),
          Text('${message.name} • ${message.email}',
              style: const TextStyle(
                  color: AppColors.gold, fontSize: 12)),
          const SizedBox(height: 8),
          Text(message.message,
              style: const TextStyle(color: Colors.white70, height: 1.5)),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton.icon(
                onPressed: () => Launchers.email(message.email,
                    subject: 'رد: ${message.subject}'),
                icon: const Icon(Icons.reply_rounded, size: 18),
                label: const Text('رد'),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.delete_rounded,
                    color: AppColors.destructive),
                onPressed: () => _delete(context),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _delete(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('حذف الرسالة؟'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('إلغاء')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('حذف')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(adminRepositoryProvider).deleteContact(message.id);
      ref.invalidate(adminContactsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('تعذّر الحذف: $e')));
      }
    }
  }
}
