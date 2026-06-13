import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/section_header.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const values = <(IconData, String, String)>[
      (
        Icons.verified_rounded,
        'تمويل إسلامي',
        'حلول تمويل متوافقة مع الشريعة بطريقة المرابحة.'
      ),
      (
        Icons.sell_rounded,
        'أفضل الأسعار',
        'أسعار تنافسية وعروض حصرية من بنوكنا الشريكة.'
      ),
      (
        Icons.shield_rounded,
        'موثوقية',
        'سيارات مفحوصة وضمان موثوق لراحة بالك.'
      ),
      (
        Icons.bolt_rounded,
        'خدمة سريعة',
        'إجراءات ميسّرة وموافقات سريعة على طلبات التمويل.'
      ),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('من نحن')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1C1A18), Color(0xFF080706)],
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
              ),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0x33FFD700)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShaderMask(
                  shaderCallback: (b) => const LinearGradient(
                    colors: AppColors.goldTextGradient,
                  ).createShader(b),
                  child: const Text(
                    'ماكس موتورز',
                    style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Colors.white),
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'وجهتك الأولى لشراء وتمويل السيارات في المملكة العربية السعودية. '
                  'نوفّر لك مجموعة واسعة من السيارات وأفضل عروض التمويل الإسلامي '
                  'من خلال شراكاتنا مع كبرى البنوك.',
                  style: TextStyle(color: Colors.white70, height: 1.7),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const SectionHeader(title: 'لماذا نحن؟'),
          const SizedBox(height: 12),
          ...values.map((v) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceAlt,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(v.$1, color: AppColors.gold),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(v.$2,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800)),
                            const SizedBox(height: 4),
                            Text(v.$3,
                                style: const TextStyle(
                                    color: AppColors.mutedForeground,
                                    fontSize: 13,
                                    height: 1.5)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              )),
          const SizedBox(height: 12),
          GradientButton(
            label: 'تواصل معنا',
            icon: Icons.support_agent_rounded,
            onPressed: () => context.push('/contact'),
          ),
        ],
      ),
    );
  }
}
