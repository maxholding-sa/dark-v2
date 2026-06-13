import 'package:flutter_test/flutter_test.dart';
import 'package:max_motors/data/demo/demo_catalog_data.dart';
import 'package:max_motors/data/models/car_filters.dart';
import 'package:max_motors/data/repositories/catalog_repository.dart';

void main() {
  test('demo catalog returns cars', () {
    final result = DemoCatalogData.getCars(const CarQuery(limit: 20));
    expect(result.items.length, greaterThan(0));
    expect(DemoCatalogData.active, isTrue);
  });

  test('catalog without supabase uses demo when configured', () async {
    final repo = CatalogRepository();
    // In test VM, AppConfig.useDemoCatalog follows kDebugMode (true in flutter test).
    final page = await repo.getCars(const CarQuery(limit: 20));
    expect(page.items.isNotEmpty, isTrue);
  });
}
