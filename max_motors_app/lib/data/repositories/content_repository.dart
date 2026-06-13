import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../demo/demo_catalog_data.dart';
import 'data_load_helper.dart';
import 'supabase_catalog_reads.dart';
import '../models/article.dart';
import '../models/bank.dart';
import '../models/car.dart';
import '../models/featured_item.dart';
import '../models/review.dart';

/// Featured home content for the landing screen.
class HomeContent {
  HomeContent({
    this.featuredCars = const [],
    this.brands = const [],
    this.models = const [],
  });
  final List<Car> featuredCars;
  final List<FeaturedItem> brands;
  final List<FeaturedItem> models;
}

/// Public marketing/content: Supabase when available, else the Next.js API.
class ContentRepository {
  ContentRepository({SupabaseClient? supabase})
      : _supabaseReads = useSupabaseCatalogReads && supabase != null
            ? SupabaseCatalogReads(supabase)
            : null;

  final SupabaseCatalogReads? _supabaseReads;

  Future<HomeContent> getHomeContent() => loadWithFallback(
        context: 'تعذر تحميل الصفحة الرئيسية',
        primary: () {
          final reads = _supabaseReads;
          if (reads == null) throw ApiException('Supabase غير مهيأ');
          return reads.getHomeContent();
        },
        fallback: () async {
          final data = await ApiClient.getData('/api/mobile/home');
          if (data is! Map) {
            throw ApiException('تعذر تحميل الصفحة الرئيسية.');
          }
          final map = Map<String, dynamic>.from(data);
          return HomeContent(
            featuredCars: _map(map['featuredCars'], Car.fromJson),
            brands: _map(map['brands'], FeaturedItem.fromJson),
            models: _map(map['models'], FeaturedItem.fromJson),
          );
        },
        demo: () => DemoCatalogData.getHomeContent(),
        isEmpty: (c) => homeContentEmpty(c),
      );

  Future<List<Bank>> getBanks() => loadWithFallback(
        context: 'تعذر تحميل البنوك',
        primary: () {
          final reads = _supabaseReads;
          if (reads == null) throw ApiException('Supabase غير مهيأ');
          return reads.getBanks();
        },
        fallback: () async {
          final data = await ApiClient.getData('/api/bank');
          return _map(data, Bank.fromJson);
        },
        demo: () => DemoCatalogData.getBanks(),
        isEmpty: listEmpty,
      );

  Future<List<FeaturedItem>> getFeaturedModels() async {
    final data = await ApiClient.getData('/api/mobile/home');
    if (data is Map) {
      return _map(data['models'], FeaturedItem.fromJson);
    }
    return const [];
  }

  Future<List<FeaturedItem>> getFeaturedBrands() async {
    final data = await ApiClient.getData('/api/mobile/home');
    if (data is Map) {
      return _map(data['brands'], FeaturedItem.fromJson);
    }
    return const [];
  }

  Future<List<Review>> getReviews({String? search}) async {
    final params = <String, dynamic>{};
    if (search != null && search.trim().isNotEmpty) {
      params['search'] = search.trim();
    }
    final data = await ApiClient.getData(
      '/api/reviews',
      queryParameters: params.isEmpty ? null : params,
    );
    return _map(data, Review.fromJson);
  }

  Future<List<Article>> getArticles() async {
    final data = await ApiClient.getData('/api/article/public');
    return _map(data, Article.fromJson);
  }

  Future<Article> getArticle(String slug) async {
    final data = await ApiClient.getData('/api/article/public/$slug');
    if (data is! Map) {
      throw ApiException('لم يتم العثور على المقال.', statusCode: 404);
    }
    return Article.fromJson(Map<String, dynamic>.from(data));
  }

  List<T> _map<T>(
    dynamic rows,
    T Function(Map<String, dynamic>) f,
  ) =>
      ApiClient.asMapList(rows).map((e) => f(e)).toList();
}
