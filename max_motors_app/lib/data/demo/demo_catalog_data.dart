import '../models/bank.dart';
import '../models/car.dart';
import '../models/car_filters.dart';
import '../models/featured_item.dart';
import '../models/paginated.dart';
import '../repositories/content_repository.dart';

/// Shown only in debug builds when Supabase and the local API are unreachable.
class DemoCatalogData {
  DemoCatalogData._();

  static bool active = false;

  static final _cars = [
    Car(
      id: 'demo-1',
      make: 'تويوتا',
      model: 'كامري',
      year: 2024,
      price: 125000,
      mileage: 12000,
      bodyType: 'سيدان',
      fuelType: 'بنزين',
      transmission: 'أوتوماتيك',
      featured: true,
      images: [
        'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
      ],
    ),
    Car(
      id: 'demo-2',
      make: 'هيونداي',
      model: 'سوناتا',
      year: 2023,
      price: 98000,
      mileage: 28000,
      bodyType: 'سيدان',
      fuelType: 'بنزين',
      transmission: 'أوتوماتيك',
      isLuxury: true,
      images: [
        'https://images.unsplash.com/photo-1605559424843-9e4c2287d66c?w=800',
      ],
    ),
    Car(
      id: 'demo-3',
      make: 'نيسان',
      model: 'باترول',
      year: 2022,
      price: 210000,
      mileage: 45000,
      bodyType: 'دفع رباعي',
      fuelType: 'بنزين',
      transmission: 'أوتوماتيك',
      featured: true,
      images: [
        'https://images.unsplash.com/photo-1519641471654-76ce0107a936?w=800',
      ],
    ),
    Car(
      id: 'demo-4',
      make: 'مرسيدس',
      model: 'E-Class',
      year: 2021,
      price: 185000,
      mileage: 52000,
      bodyType: 'سيدان',
      fuelType: 'بنزين',
      transmission: 'أوتوماتيك',
      isLuxury: true,
      images: [
        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800',
      ],
    ),
  ];

  static final _banks = [
    Bank(
      id: 'demo-bank-1',
      name: 'البنك الأهلي',
      interestRate: 4.5,
    ),
    Bank(
      id: 'demo-bank-2',
      name: 'بنك الراجحي',
      interestRate: 3.9,
    ),
  ];

  static final _brands = [
    FeaturedItem(id: 'b1', name: 'Toyota', nameAr: 'تويوتا', order: 1),
    FeaturedItem(id: 'b2', name: 'Hyundai', nameAr: 'هيونداي', order: 2),
    FeaturedItem(id: 'b3', name: 'Nissan', nameAr: 'نيسان', order: 3),
  ];

  static void markActive() {
    active = true;
  }

  static void markInactive() {
    active = false;
  }

  static Paginated<Car> getCars(CarQuery query) {
    markActive();
    var list = List<Car>.from(_cars);
    final term = query.search.trim().toLowerCase();
    if (term.isNotEmpty) {
      list = list
          .where((c) =>
              c.make.toLowerCase().contains(term) ||
              c.model.toLowerCase().contains(term))
          .toList();
    }
    if (query.make.isNotEmpty) {
      list = list.where((c) => c.make == query.make).toList();
    }
    final start = (query.page - 1) * query.limit;
    final slice = list.skip(start).take(query.limit).toList();
    final pages = list.isEmpty ? 1 : (list.length / query.limit).ceil();
    return Paginated<Car>(
      items: slice,
      total: list.length,
      page: query.page,
      pages: pages,
    );
  }

  static Car? getCarById(String id) {
    markActive();
    for (final c in _cars) {
      if (c.id == id) return c;
    }
    return null;
  }

  static CarFilterOptions getFilters() {
    markActive();
    return CarFilterOptions(
      makes: _cars.map((c) => c.make).toSet().toList(),
      bodyTypes: _cars.map((c) => c.bodyType ?? '').where((s) => s.isNotEmpty).toSet().toList(),
      fuelTypes: _cars.map((c) => c.fuelType ?? '').where((s) => s.isNotEmpty).toSet().toList(),
      transmissions:
          _cars.map((c) => c.transmission ?? '').where((s) => s.isNotEmpty).toSet().toList(),
      minPrice: 90000,
      maxPrice: 220000,
    );
  }

  static HomeContent getHomeContent() {
    markActive();
    return HomeContent(
      featuredCars: _cars.where((c) => c.featured).toList(),
      brands: _brands,
      models: const [],
    );
  }

  static List<Bank> getBanks() {
    markActive();
    return _banks;
  }
}
