import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/auth/clerk_session_sync.dart';
import 'core/config/app_config.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('ar');

  // Connect to the same Supabase project the web app uses. Data is read/written
  // directly through Supabase (PostgREST + Storage); access is governed by RLS.
  if (AppConfig.hasSupabase) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
      authOptions: FlutterAuthClientOptions(
        localStorage: SharedPreferencesLocalStorage(
          persistSessionKey: 'supabase.auth.token',
        ),
      ),
    );
  }

  runApp(const ProviderScope(child: MaxMotorsApp()));
}

class MaxMotorsApp extends StatelessWidget {
  const MaxMotorsApp({super.key});

  @override
  Widget build(BuildContext context) {
    final router = buildRouter();

    Widget app = MaterialApp.router(
      title: 'ماكس موتورز',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      themeMode: ThemeMode.dark,
      routerConfig: router,
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) {
        // Force RTL across the whole tree (incl. Clerk furniture).
        final content = Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        );
        // Clerk uses path_provider, which is not implemented on Flutter web.
        final useClerk = AppConfig.hasClerk && !kIsWeb;
        return useClerk ? ClerkSessionSync(child: content) : content;
      },
    );

    // Wrap with Clerk on mobile/desktop only (not web).
    if (AppConfig.hasClerk && !kIsWeb) {
      app = ClerkAuth(
        config: ClerkAuthConfig(
          publishableKey: AppConfig.clerkPublishableKey,
        ),
        child: app,
      );
    }
    return app;
  }
}
