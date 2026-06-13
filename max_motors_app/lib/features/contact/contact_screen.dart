import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/launchers.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/section_header.dart';
import '../../data/providers.dart';

class ContactScreen extends ConsumerStatefulWidget {
  const ContactScreen({super.key});

  @override
  ConsumerState<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends ConsumerState<ContactScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _submitting = true);
    try {
      await ref.read(formsRepositoryProvider).submitContact(
            name: _name.text.trim(),
            email: _email.text.trim(),
            subject: _subject.text.trim(),
            message: _message.text.trim(),
          );
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم إرسال رسالتك، شكراً لتواصلك معنا')),
      );
      if (context.canPop()) context.pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذّر الإرسال: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('تواصل معنا')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(
                  child: _QuickAction(
                    icon: Icons.chat_rounded,
                    label: 'واتساب',
                    color: const Color(0xFF25D366),
                    onTap: () => Launchers.whatsapp('مرحباً، لدي استفسار'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickAction(
                    icon: Icons.call_rounded,
                    label: 'اتصال',
                    color: AppColors.gold,
                    onTap: () =>
                        Launchers.call('+${AppConfig.whatsappNumber}'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const SectionHeader(
              title: 'أرسل لنا رسالة',
              subtitle: 'سنرد عليك في أقرب وقت ممكن',
            ),
            const SizedBox(height: 16),
            GlassCard(
              child: Column(
                children: [
                  TextFormField(
                    controller: _name,
                    decoration: const InputDecoration(labelText: 'الاسم *'),
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
                    controller: _subject,
                    decoration: const InputDecoration(labelText: 'الموضوع *'),
                    validator: (v) =>
                        (v?.trim().isEmpty ?? true) ? 'مطلوب' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _message,
                    maxLines: 5,
                    decoration: const InputDecoration(labelText: 'الرسالة *'),
                    validator: (v) =>
                        (v?.trim().isEmpty ?? true) ? 'مطلوب' : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            GradientButton(
              label: 'إرسال',
              icon: Icons.send_rounded,
              loading: _submitting,
              onPressed: _submitting ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Column(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
