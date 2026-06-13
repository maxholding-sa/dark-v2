import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';

/// Lightweight snapshot of Clerk auth state, kept in sync by
/// [ClerkSessionSync] so the rest of the app (router guards, repositories) can
/// react without depending on Clerk widgets directly.
class AuthSnapshot {
  const AuthSnapshot({
    this.signedIn = false,
    this.displayName,
    this.email,
  });

  final bool signedIn;
  final String? displayName;
  final String? email;

  AuthSnapshot copyWith({bool? signedIn, String? displayName, String? email}) =>
      AuthSnapshot(
        signedIn: signedIn ?? this.signedIn,
        displayName: displayName ?? this.displayName,
        email: email ?? this.email,
      );
}

final authStateProvider =
    StateProvider<AuthSnapshot>((ref) => const AuthSnapshot());

/// Whether the signed-in user is an admin, resolved from the Supabase `User`
/// table by email (requires anon read access to that row via RLS).
final isAdminProvider = FutureProvider.autoDispose<bool>((ref) async {
  final auth = ref.watch(authStateProvider);
  if (!auth.signedIn || (auth.email?.isEmpty ?? true)) return false;
  try {
    final db = ref.watch(supabaseClientProvider);
    final row = await db
        .from('User')
        .select('role')
        .eq('email', auth.email!)
        .maybeSingle();
    final role = row?['role'];
    return role?.toString().toUpperCase() == 'ADMIN';
  } catch (_) {
    return false;
  }
});
