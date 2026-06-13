import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_state.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/app_network_image.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/rating_stars.dart';
import '../../data/models/review.dart';
import '../../data/providers.dart';

class ReviewsScreen extends ConsumerStatefulWidget {
  const ReviewsScreen({super.key});

  @override
  ConsumerState<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends ConsumerState<ReviewsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openReviewForm() {
    final signedIn = ref.read(authStateProvider).signedIn;
    if (!signedIn) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى تسجيل الدخول لإضافة مراجعة')),
      );
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const _ReviewFormSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final reviews = ref.watch(reviewsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('آراء العملاء')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openReviewForm,
        backgroundColor: AppColors.gold,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.rate_review_rounded),
        label: const Text('أضف رأيك'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              textInputAction: TextInputAction.search,
              onSubmitted: (v) =>
                  ref.read(reviewsSearchProvider.notifier).state = v,
              decoration: InputDecoration(
                hintText: 'ابحث في المراجعات...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(reviewsSearchProvider.notifier).state = '';
                        },
                      ),
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => ref.invalidate(reviewsProvider),
              child: AsyncView(
                value: reviews,
                isEmpty: (list) => list.isEmpty,
                emptyMessage: 'لا توجد مراجعات بعد',
                emptyIcon: Icons.reviews_outlined,
                onRetry: () => ref.invalidate(reviewsProvider),
                data: (list) => ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _ReviewCard(review: list[i]),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});
  final Review review;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.surfaceAlt,
                child: Text(
                  review.clientName.isNotEmpty ? review.clientName[0] : '?',
                  style: const TextStyle(color: AppColors.gold),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(review.clientName,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    if (review.city != null && review.city!.isNotEmpty)
                      Text(review.city!,
                          style: const TextStyle(
                              color: AppColors.mutedForeground, fontSize: 12)),
                  ],
                ),
              ),
              RatingStars(rating: review.rating, size: 16),
            ],
          ),
          if (review.car != null && review.car!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.directions_car_rounded,
                    size: 14, color: AppColors.gold),
                const SizedBox(width: 6),
                Text(review.car!,
                    style: const TextStyle(
                        color: AppColors.gold, fontSize: 12)),
              ],
            ),
          ],
          if (review.reviewText != null && review.reviewText!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(review.reviewText!,
                style: const TextStyle(height: 1.5, color: Colors.white70)),
          ],
          if (review.imageUrl != null && review.imageUrl!.isNotEmpty) ...[
            const SizedBox(height: 10),
            AppNetworkImage(
              url: review.imageUrl,
              height: 160,
              width: double.infinity,
              borderRadius: 10,
            ),
          ],
          if (review.createdAt != null) ...[
            const SizedBox(height: 8),
            Text(Formatters.dateArabic(review.createdAt),
                style: const TextStyle(
                    color: AppColors.mutedForeground, fontSize: 11)),
          ],
        ],
      ),
    );
  }
}

class _ReviewFormSheet extends ConsumerStatefulWidget {
  const _ReviewFormSheet();

  @override
  ConsumerState<_ReviewFormSheet> createState() => _ReviewFormSheetState();
}

class _ReviewFormSheetState extends ConsumerState<_ReviewFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _city = TextEditingController();
  final _car = TextEditingController();
  final _text = TextEditingController();
  int _rating = 5;
  bool _submitting = false;

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    _car.dispose();
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _submitting = true);
    try {
      await ref.read(formsRepositoryProvider).submitReview(
            clientName: _name.text.trim(),
            city: _city.text.trim(),
            car: _car.text.trim(),
            rating: _rating,
            reviewText: _text.text.trim(),
          );
      ref.invalidate(reviewsProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('شكراً لك! تم إرسال مراجعتك')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذّر إرسال المراجعة: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('أضف رأيك',
                    style: TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                Center(
                  child: RatingSelector(
                    rating: _rating,
                    onChanged: (v) => setState(() => _rating = v),
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'الاسم *'),
                  validator: (v) =>
                      (v?.trim().isEmpty ?? true) ? 'مطلوب' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _city,
                  decoration: const InputDecoration(labelText: 'المدينة'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _car,
                  decoration: const InputDecoration(labelText: 'السيارة'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _text,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'رأيك *'),
                  validator: (v) =>
                      (v?.trim().isEmpty ?? true) ? 'مطلوب' : null,
                ),
                const SizedBox(height: 16),
                GradientButton(
                  label: 'إرسال',
                  loading: _submitting,
                  onPressed: _submitting ? null : _submit,
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
