import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/section_header.dart';
import '../../data/local/local_requests.dart';
import '../../data/providers.dart';

class CompanyRequestScreen extends ConsumerStatefulWidget {
  const CompanyRequestScreen({super.key});

  @override
  ConsumerState<CompanyRequestScreen> createState() =>
      _CompanyRequestScreenState();
}

class _CompanyRequestScreenState extends ConsumerState<CompanyRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _company = TextEditingController();
  final _contactName = TextEditingController();
  final _email = TextEditingController();
  final _mobile = TextEditingController();
  final _details = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _company.dispose();
    _contactName.dispose();
    _email.dispose();
    _mobile.dispose();
    _details.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _submitting = true);
    final message = 'طلب انضمام شركة\n'
        'اسم الشركة: ${_company.text.trim()}\n'
        'مسؤول التواصل: ${_contactName.text.trim()}\n'
        'الجوال: +966${_mobile.text.trim()}\n'
        'تفاصيل: ${_details.text.trim()}';
    try {
      await ref.read(formsRepositoryProvider).submitContact(
            name: _contactName.text.trim(),
            email: _email.text.trim(),
            subject: 'طلب انضمام شركة: ${_company.text.trim()}',
            message: message,
          );
      await LocalRequests.instance.add(MyRequest(
        type: 'company',
        title: 'طلب انضمام: ${_company.text.trim()}',
        subtitle: 'بانتظار المراجعة',
        createdAt: DateTime.now(),
      ));
      if (!mounted) return;
      _done('تم استلام طلبك، سنتواصل معك قريباً');
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذّر الإرسال: $e')),
      );
    }
  }

  void _done(String msg) {
    setState(() => _submitting = false);
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
    if (context.canPop()) context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('انضم كشريك')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const SectionHeader(
              title: 'كن شريكاً معنا',
              subtitle: 'سجّل شركتك أو معرضك للانضمام إلى منصة ماكس موتورز',
            ),
            const SizedBox(height: 16),
            GlassCard(
              child: Column(
                children: [
                  TextFormField(
                    controller: _company,
                    decoration:
                        const InputDecoration(labelText: 'اسم الشركة / المعرض *'),
                    validator: (v) =>
                        (v?.trim().isEmpty ?? true) ? 'مطلوب' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _contactName,
                    decoration:
                        const InputDecoration(labelText: 'مسؤول التواصل *'),
                    validator: (v) =>
                        (v?.trim().isEmpty ?? true) ? 'مطلوب' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration:
                        const InputDecoration(labelText: 'البريد الإلكتروني *'),
                    validator: (v) {
                      final s = v?.trim() ?? '';
                      if (s.isEmpty) return 'مطلوب';
                      if (!s.contains('@')) return 'بريد غير صالح';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _mobile,
                    keyboardType: TextInputType.phone,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(9),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'رقم الجوال *',
                      prefixText: '+966 ',
                      hintText: '5xxxxxxxx',
                    ),
                    validator: (v) =>
                        (v?.trim().length ?? 0) < 9 ? 'رقم غير صحيح' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _details,
                    maxLines: 4,
                    decoration: const InputDecoration(
                        labelText: 'نبذة عن نشاطكم (اختياري)'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            GradientButton(
              label: 'إرسال الطلب',
              icon: Icons.send_rounded,
              loading: _submitting,
              onPressed: _submitting ? null : _submit,
            ),
            const SizedBox(height: 12),
            const Text(
              'سيقوم فريقنا بمراجعة طلبك والتواصل معك خلال أيام العمل.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.mutedForeground, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
