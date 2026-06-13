import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'models/article.dart';
import 'models/bank.dart';
import 'models/car.dart';
import 'models/car_filters.dart';
import 'models/featured_item.dart';
import 'models/paginated.dart';
import 'models/review.dart';
import 'models/loan_request.dart';
import 'repositories/admin_repository.dart';
import 'repositories/catalog_repository.dart';
import 'repositories/content_repository.dart';
import 'repositories/finance_repository.dart';
import 'repositories/forms_repository.dart';

// ---- Infrastructure ----
final supabaseClientProvider =
    Provider<SupabaseClient>((ref) => Supabase.instance.client);

// ---- Repositories ----
final catalogRepositoryProvider = Provider<CatalogRepository>(
  (ref) => CatalogRepository(supabase: ref.watch(supabaseClientProvider)),
);
final contentRepositoryProvider = Provider<ContentRepository>(
  (ref) => ContentRepository(supabase: ref.watch(supabaseClientProvider)),
);
final financeRepositoryProvider =
    Provider<FinanceRepository>((ref) => FinanceRepository());
final formsRepositoryProvider = Provider<FormsRepository>(
    (ref) => FormsRepository(ref.watch(supabaseClientProvider)));
final adminRepositoryProvider = Provider<AdminRepository>(
    (ref) => AdminRepository(ref.watch(supabaseClientProvider)));

// ---- Content reads ----
final homeContentProvider = FutureProvider.autoDispose<HomeContent>(
    (ref) => ref.watch(contentRepositoryProvider).getHomeContent());

final banksProvider = FutureProvider.autoDispose<List<Bank>>(
    (ref) => ref.watch(contentRepositoryProvider).getBanks());

final featuredModelsProvider = FutureProvider.autoDispose<List<FeaturedItem>>(
    (ref) => ref.watch(contentRepositoryProvider).getFeaturedModels());

final reviewsSearchProvider = StateProvider.autoDispose<String>((ref) => '');

final reviewsProvider = FutureProvider.autoDispose<List<Review>>((ref) {
  final search = ref.watch(reviewsSearchProvider);
  return ref.watch(contentRepositoryProvider).getReviews(search: search);
});

final articlesProvider = FutureProvider.autoDispose<List<Article>>(
    (ref) => ref.watch(contentRepositoryProvider).getArticles());

final articleProvider = FutureProvider.autoDispose
    .family<Article, String>((ref, slug) =>
        ref.watch(contentRepositoryProvider).getArticle(slug));

// ---- Catalog reads ----
final carFiltersProvider = FutureProvider.autoDispose<CarFilterOptions>(
    (ref) => ref.watch(catalogRepositoryProvider).getFilters());

final carQueryProvider =
    StateProvider.autoDispose<CarQuery>((ref) => const CarQuery());

final carsProvider = FutureProvider.autoDispose<Paginated<Car>>((ref) {
  final query = ref.watch(carQueryProvider);
  return ref.watch(catalogRepositoryProvider).getCars(query);
});

final carByIdProvider = FutureProvider.autoDispose
    .family<Car, String>((ref, id) =>
        ref.watch(catalogRepositoryProvider).getCarById(id));

// ---- Admin reads (require an authenticated admin Clerk session) ----
final adminContactsProvider = FutureProvider.autoDispose<List<ContactMessage>>(
    (ref) => ref.watch(adminRepositoryProvider).getContacts());

final adminLoanRequestsProvider = FutureProvider.autoDispose<List<LoanRequest>>(
    (ref) => ref.watch(adminRepositoryProvider).getLoanRequests());
