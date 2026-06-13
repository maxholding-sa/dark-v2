import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/app_network_image.dart';
import '../../core/widgets/async_view.dart';
import '../../data/models/article.dart';
import '../../data/providers.dart';

class ArticlesScreen extends ConsumerWidget {
  const ArticlesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articles = ref.watch(articlesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('المقالات')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(articlesProvider),
        child: AsyncView(
          value: articles,
          isEmpty: (list) => list.isEmpty,
          emptyMessage: 'لا توجد مقالات بعد',
          emptyIcon: Icons.article_outlined,
          onRetry: () => ref.invalidate(articlesProvider),
          data: (list) => ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 14),
            itemBuilder: (_, i) => _ArticleCard(article: list[i]),
          ),
        ),
      ),
    );
  }
}

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article});
  final Article article;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/articles/${article.slug}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (article.image != null && article.image!.isNotEmpty)
              AspectRatio(
                aspectRatio: 16 / 9,
                child: AppNetworkImage(url: article.image),
              ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    article.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  if (article.excerpt != null &&
                      article.excerpt!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      article.excerpt!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: AppColors.mutedForeground,
                          fontSize: 13,
                          height: 1.4),
                    ),
                  ],
                  if (article.publishedAt != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      Formatters.dateArabic(article.publishedAt),
                      style: const TextStyle(
                          color: AppColors.gold, fontSize: 11),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
