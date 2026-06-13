import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:max_motors/data/providers.dart';
import 'package:max_motors/data/repositories/content_repository.dart';
import 'package:max_motors/main.dart';

void main() {
  testWidgets('App boots and shows the home title', (tester) async {
    // Override the network-backed providers so the smoke test runs hermetically
    // (no Dio calls / pending timers).
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          homeContentProvider.overrideWith((ref) => HomeContent()),
          banksProvider.overrideWith((ref) => const []),
        ],
        child: const MaxMotorsApp(),
      ),
    );
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.text('ماكس موتورز'), findsWidgets);
  });
}
