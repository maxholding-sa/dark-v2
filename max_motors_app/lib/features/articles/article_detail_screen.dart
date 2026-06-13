import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/app_network_image.dart';
import '../../core/widgets/async_view.dart';
import '../../data/models/article.dart';
import '../../data/providers.dart';

class ArticleDetailScreen extends ConsumerWidget {
  const ArticleDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final article = ref.watch(articleProvider(slug));
    return Scaffold(
      appBar: AppBar(
        title: const Text('مقال'),
        actions: [
          IconButton(
            onPressed: () =>
                Share.share('اقرأ هذا المقال في ماكس موتورز: $slug'),
            icon: const Icon(Icons.share_rounded),
          ),
        ],
      ),
      body: AsyncView(
        value: article,
        onRetry: () => ref.invalidate(articleProvider(slug)),
        data: (a) => _content(a),
      ),
    );
  }

  Widget _content(Article a) {
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        if (a.image != null && a.image!.isNotEmpty)
          AspectRatio(
            aspectRatio: 16 / 9,
            child: AppNetworkImage(url: a.image),
          ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                a.title,
                style:
                    const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
              ),
              if (a.publishedAt != null) ...[
                const SizedBox(height: 8),
                Text(
                  Formatters.dateArabic(a.publishedAt),
                  style: const TextStyle(color: AppColors.gold, fontSize: 12),
                ),
              ],
              if (a.tags.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: a.tags
                      .map((t) => Chip(
                            label: Text(t),
                            backgroundColor: AppColors.surfaceAlt,
                          ))
                      .toList(),
                ),
              ],
              const SizedBox(height: 16),
              Text(
                (a.content != null && a.content!.isNotEmpty)
                    ? a.content!
                    : (a.excerpt ?? 'لا يوجد محتوى لعرضه.'),
                style: const TextStyle(
                    height: 1.8, color: Colors.white70, fontSize: 15),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
