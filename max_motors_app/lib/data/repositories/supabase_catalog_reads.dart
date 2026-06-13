import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_exception.dart';
import '../../core/supabase/supabase_helpers.dart';
import '../models/bank.dart';
import '../models/car.dart';
import '../models/car_filters.dart';
import '../models/featured_item.dart';
import '../models/paginated.dart';
import 'content_repository.dart';

/// Public catalog reads via Supabase PostgREST (same Postgres as Prisma).
class SupabaseCatalogReads {
  SupabaseCatalogReads(this._db);
  final SupabaseClient _db;

  static const _available = 'AVAILABLE';

  Future<Paginated<Car>> getCars(CarQuery query) async {
    try {
      final from = (query.page - 1) * query.limit;
      final to = from + query.limit - 1;

      dynamic builder = _db.from('Car').select('*').eq('status', _available);
      builder = _applyQueryFilters(builder, query);

      builder = builder
          .order('isLuxury', ascending: false)
          .order('featured', ascending: false);
      switch (query.sortBy) {
        case 'priceAsc':
          builder = builder.order('price', ascending: true);
          break;
        case 'priceDesc':
          builder = builder.order('price', ascending: false);
          break;
        case 'newest':
        default:
          builder = builder.order('createdAt', ascending: false);
          break;
      }

      final rows = await builder.range(from, to);
      final list = (rows as List?) ?? const [];

      final items = list
          .map((e) => Car.fromJson(_normalizeCarRow(e)))
          .toList();

      final hasMore = list.length >= query.limit;
      final total = hasMore
          ? query.page * query.limit + 1
          : (query.page - 1) * query.limit + items.length;
      final pages = hasMore ? query.page + 1 : query.page;
      return Paginated<Car>(
        items: items,
        total: total,
        page: query.page,
        pages: pages,
      );
    } catch (e) {
      throwAsApi(e);
    }
  }

  Future<Car> getCarById(String id) async {
    try {
      final row = await _db
          .from('Car')
          .select()
          .eq('id', id)
          .maybeSingle();
      if (row == null) {
        throw ApiException('لم يتم العثور على السيارة.', statusCode: 404);
      }
      return Car.fromJson(_normalizeCarRow(row));
    } catch (e) {
      throwAsApi(e);
    }
  }

  Future<CarFilterOptions> getFilters() async {
    try {
      final rows = await _db
          .from('Car')
          .select('make, bodyType, fuelType, transmission, price')
          .eq('status', _available);

      final makes = <String>{};
      final bodyTypes = <String>{};
      final fuelTypes = <String>{};
      final transmissions = <String>{};
      double minPrice = double.infinity;
      double maxPrice = 0;

      for (final raw in rows) {
        final row = Map<String, dynamic>.from(raw);
        final make = row['make']?.toString();
        if (make != null && make.isNotEmpty) makes.add(make);
        final body = row['bodyType']?.toString();
        if (body != null && body.isNotEmpty) bodyTypes.add(body);
        final fuel = row['fuelType']?.toString();
        if (fuel != null && fuel.isNotEmpty) fuelTypes.add(fuel);
        final trans = row['transmission']?.toString();
        if (trans != null && trans.isNotEmpty) transmissions.add(trans);
        final price = _parsePrice(row['price']);
        if (price != null) {
          if (price < minPrice) minPrice = price;
          if (price > maxPrice) maxPrice = price;
        }
      }

      if (minPrice == double.infinity) minPrice = 0;
      if (maxPrice <= 0) maxPrice = 1000000;

      return CarFilterOptions(
        makes: makes.toList()..sort(),
        bodyTypes: bodyTypes.toList()..sort(),
        fuelTypes: fuelTypes.toList()..sort(),
        transmissions: transmissions.toList()..sort(),
        minPrice: minPrice,
        maxPrice: maxPrice,
      );
    } catch (e) {
      throwAsApi(e);
    }
  }

  Future<HomeContent> getHomeContent() async {
    try {
      final carsRes = await _db
          .from('Car')
          .select()
          .eq('status', _available)
          .order('isLuxury', ascending: false)
          .order('featured', ascending: false)
          .order('createdAt', ascending: false)
          .limit(10);

      final brandsRes = await _db
          .from('FeaturedBrand')
          .select()
          .eq('isActive', true)
          .order('order', ascending: true);

      final modelsRes = await _db
          .from('FeaturedModel')
          .select()
          .eq('isActive', true)
          .order('order', ascending: true);

      return HomeContent(
        featuredCars: (carsRes as List)
            .map((e) => Car.fromJson(_normalizeCarRow(e)))
            .toList(),
        brands: (brandsRes as List)
            .map((e) => FeaturedItem.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
        models: (modelsRes as List)
            .map((e) => FeaturedItem.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
    } catch (e) {
      throwAsApi(e);
    }
  }

  Future<List<Bank>> getBanks() async {
    try {
      final rows = await _db
          .from('Bank')
          .select()
          .order('createdAt', ascending: false);
      return (rows as List)
          .map((e) => Bank.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throwAsApi(e);
    }
  }

  dynamic _applyQueryFilters(dynamic request, CarQuery query) {
    final term = query.search.trim();
    if (term.isNotEmpty) {
      final pattern = '%$term%';
      request = request.or(
        'make.ilike.$pattern,model.ilike.$pattern,description.ilike.$pattern',
      );
    }
    if (query.make.isNotEmpty) {
      request = request.ilike('make', query.make);
    }
    if (query.bodyType.isNotEmpty) {
      request = request.eq('bodyType', query.bodyType);
    }
    if (query.fuelType.isNotEmpty) {
      request = request.eq('fuelType', query.fuelType);
    }
    if (query.transmission.isNotEmpty) {
      request = request.eq('transmission', query.transmission);
    }
    if (query.minPrice != null) {
      request = request.gte('price', query.minPrice!);
    }
    if (query.maxPrice != null) {
      request = request.lte('price', query.maxPrice!);
    }
    return request;
  }

  Map<String, dynamic> _normalizeCarRow(dynamic row) {
    final map = Map<String, dynamic>.from(row as Map);
    final price = map['price'];
    if (price != null && price is! num) {
      map['price'] = _parsePrice(price) ?? 0;
    }
    return map;
  }

  double? _parsePrice(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }
}

bool get useSupabaseCatalogReads => AppConfig.hasSupabase;
