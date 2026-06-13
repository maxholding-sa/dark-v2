import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/app_network_image.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../data/models/bank.dart';
import '../../data/providers.dart';

class AdminBanksScreen extends ConsumerWidget {
  const AdminBanksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final banks = ref.watch(banksProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('إدارة البنوك')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.gold,
        foregroundColor: Colors.black,
        onPressed: () => _openForm(context, ref, null),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(banksProvider),
        child: AsyncView(
          value: banks,
          isEmpty: (list) => list.isEmpty,
          emptyMessage: 'لا توجد بنوك',
          onRetry: () => ref.invalidate(banksProvider),
          data: (list) => ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) {
              final bank = list[i];
              return GlassCard(
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: AppNetworkImage(
                          url: bank.logoImage, width: 44, height: 44),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(bank.name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700)),
                          Text('${bank.interestRate}%',
                              style: const TextStyle(
                                  color: AppColors.gold, fontSize: 12)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit_rounded,
                          color: AppColors.gold),
                      onPressed: () => _openForm(context, ref, bank),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_rounded,
                          color: AppColors.destructive),
                      onPressed: () => _confirmDelete(context, ref, bank),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  void _openForm(BuildContext context, WidgetRef ref, Bank? bank) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _BankFormSheet(bank: bank),
    );
  }

  Future<void> _confirmDelete(
      BuildContext context, WidgetRef ref, Bank bank) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('حذف ${bank.name}؟'),
        content: const Text('لا يمكن التراجع عن هذا الإجراء.'),
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
      await ref.read(adminRepositoryProvider).deleteBank(bank.id);
      ref.invalidate(banksProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('تعذّر الحذف: $e')));
      }
    }
  }
}

class _BankFormSheet extends ConsumerStatefulWidget {
  const _BankFormSheet({this.bank});
  final Bank? bank;

  @override
  ConsumerState<_BankFormSheet> createState() => _BankFormSheetState();
}

class _BankFormSheetState extends ConsumerState<_BankFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _logo;
  late final TextEditingController _rate;
  late final TextEditingController _policy;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final b = widget.bank;
    _name = TextEditingController(text: b?.name ?? '');
    _logo = TextEditingController(text: b?.logoImage ?? '');
    _rate = TextEditingController(text: b?.interestRate.toString() ?? '');
    _policy = TextEditingController(text: b?.loanPolicy ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _logo.dispose();
    _rate.dispose();
    _policy.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    final repo = ref.read(adminRepositoryProvider);
    final rate = double.tryParse(_rate.text.trim()) ?? 0;
    try {
      if (widget.bank == null) {
        await repo.createBank(
          name: _name.text.trim(),
          logoImage: _logo.text.trim(),
          interestRate: rate,
          loanPolicy: _policy.text.trim().isEmpty ? null : _policy.text.trim(),
        );
      } else {
        await repo.updateBank(
          id: widget.bank!.id,
          name: _name.text.trim(),
          logoImage: _logo.text.trim(),
          interestRate: rate,
          loanPolicy: _policy.text.trim().isEmpty ? null : _policy.text.trim(),
        );
      }
      ref.invalidate(banksProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('تعذّر الحفظ: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.bank == null ? 'إضافة بنك' : 'تعديل بنك',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'اسم البنك *'),
                  validator: (v) =>
                      (v?.trim().isEmpty ?? true) ? 'مطلوب' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _logo,
                  decoration: const InputDecoration(labelText: 'رابط الشعار'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _rate,
                  keyboardType: const TextInputType.numberWithOptions(
                      decimal: true),
                  decoration:
                      const InputDecoration(labelText: 'نسبة التمويل (%) *'),
                  validator: (v) =>
                      double.tryParse(v?.trim() ?? '') == null
                          ? 'أدخل رقماً صحيحاً'
                          : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _policy,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'سياسة التمويل'),
                ),
                const SizedBox(height: 16),
                GradientButton(
                  label: 'حفظ',
                  loading: _saving,
                  onPressed: _saving ? null : _save,
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
