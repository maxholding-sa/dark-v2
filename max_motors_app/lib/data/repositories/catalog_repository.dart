import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../demo/demo_catalog_data.dart';
import '../models/car.dart';
import '../models/car_filters.dart';
import '../models/paginated.dart';
import 'data_load_helper.dart';
import 'supabase_catalog_reads.dart';

/// Car catalog: Supabase first, then Next.js API, then debug demo data.
class CatalogRepository {
  CatalogRepository({SupabaseClient? supabase})
      : _supabaseReads = useSupabaseCatalogReads && supabase != null
            ? SupabaseCatalogReads(supabase)
            : null;

  final SupabaseCatalogReads? _supabaseReads;

  Future<Paginated<Car>> getCars(CarQuery query) => loadWithFallback(
        context: 'تعذر تحميل السيارات',
        primary: () {
          final reads = _supabaseReads;
          if (reads == null) {
            throw ApiException('Supabase غير مهيأ');
          }
          return reads.getCars(query);
        },
        fallback: () => _getCarsFromApi(query),
        demo: () => DemoCatalogData.getCars(query),
        isEmpty: (p) => paginatedCarsEmpty(p),
      );

  Future<Car> getCarById(String id) => loadWithFallback(
        context: 'تعذر تحميل السيارة',
        primary: () async {
          final reads = _supabaseReads;
          if (reads == null) throw ApiException('Supabase غير مهيأ');
          return reads.getCarById(id);
        },
        fallback: () => _getCarByIdFromApi(id),
        demo: () {
          final car = DemoCatalogData.getCarById(id);
          if (car == null) {
            throw ApiException('لم يتم العثور على السيارة.', statusCode: 404);
          }
          return car;
        },
      );

  Future<CarFilterOptions> getFilters() => loadWithFallback(
        context: 'تعذر تحميل التصفية',
        primary: () {
          final reads = _supabaseReads;
          if (reads == null) throw ApiException('Supabase غير مهيأ');
          return reads.getFilters();
        },
        fallback: () => _getFiltersFromApi(),
        demo: () => DemoCatalogData.getFilters(),
      );

  Future<List<String>> getMakes({String? year}) async {
    try {
      final data = await ApiClient.getData(
        '/api/car-makes',
        queryParameters: year != null && year.isNotEmpty ? {'year': year} : null,
      );
      return _stringList(data);
    } catch (_) {
      final filters = await getFilters();
      return filters.makes;
    }
  }

  Future<List<String>> getModels(String make) async {
    try {
      final data = await ApiClient.getData(
        '/api/car-models',
        queryParameters: {'make': make},
      );
      return _stringList(data);
    } catch (_) {
      return const [];
    }
  }

  Future<List<String>> getYears({String? make, String? model}) async {
    try {
      final params = <String, dynamic>{};
      if (make != null && make.isNotEmpty) params['make'] = make;
      if (model != null && model.isNotEmpty) params['model'] = model;
      final data = await ApiClient.getData(
        '/api/car-years',
        queryParameters: params.isEmpty ? null : params,
      );
      return _stringList(data);
    } catch (_) {
      return const [];
    }
  }

  Future<List<String>> getSuggestions(String q) async {
    final term = q.trim();
    if (term.isEmpty) return const [];
    try {
      final data = await ApiClient.getData(
        '/api/search-suggestions',
        queryParameters: {'q': term},
      );
      return _stringList(data);
    } catch (_) {
      return const [];
    }
  }

  Future<Paginated<Car>> _getCarsFromApi(CarQuery query) async {
    final body = await ApiClient.getEnvelope(
      '/api/cars',
      queryParameters: query.toQueryParameters(),
    );
    final items = ApiClient.asMapList(body['data'])
        .map((e) => Car.fromJson(e))
        .toList();
    final pagination = (body['pagination'] as Map?) ?? const {};
    int asInt(dynamic v, int fallback) =>
        v is num ? v.toInt() : int.tryParse(v?.toString() ?? '') ?? fallback;

    final page = asInt(pagination['page'], query.page);
    final pages = asInt(pagination['pages'], 1);
    final total = asInt(pagination['total'], items.length);

    return Paginated<Car>(
      items: items,
      total: total,
      page: page,
      pages: pages,
    );
  }

  Future<Car> _getCarByIdFromApi(String id) async {
    final data = await ApiClient.getData('/api/cars/$id');
    if (data is! Map) {
      throw ApiException('لم يتم العثور على السيارة.', statusCode: 404);
    }
    return Car.fromJson(Map<String, dynamic>.from(data));
  }

  Future<CarFilterOptions> _getFiltersFromApi() async {
    final data = await ApiClient.getData('/api/cars/filters');
    if (data is! Map) {
      throw ApiException('تعذر تحميل خيارات التصفية.');
    }
    return CarFilterOptions.fromJson(Map<String, dynamic>.from(data));
  }

  List<String> _stringList(dynamic data) {
    if (data is! List) return const [];
    return data.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
  }
}
