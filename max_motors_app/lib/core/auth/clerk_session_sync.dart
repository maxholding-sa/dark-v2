import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/auth_token_store.dart';
import 'auth_state.dart';

/// Bridges the Clerk SDK state into the app:
/// - pushes the latest session JWT into [AuthTokenStore] for the Dio interceptor
/// - mirrors signed-in state into [authStateProvider]
///
/// Place this directly under [ClerkAuth] in the widget tree.
class ClerkSessionSync extends ConsumerStatefulWidget {
  const ClerkSessionSync({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ClerkSessionSync> createState() => _ClerkSessionSyncState();
}

class _ClerkSessionSyncState extends ConsumerState<ClerkSessionSync> {
  ClerkAuthState? _authState;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final state = ClerkAuth.of(context);
    if (identical(state, _authState)) return;

    _authState?.removeListener(_onAuthChanged);
    _authState = state;
    state.addListener(_onAuthChanged);
    _onAuthChanged();
  }

  void _onAuthChanged() {
    final state = _authState;
    if (state == null) return;
    final signedIn = state.user != null;
    // Defer side-effects out of the build/notify cycle.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      if (signedIn) {
        try {
          final token = await state.sessionToken();
          AuthTokenStore.instance.update(token.jwt);
        } catch (_) {
          // Token not yet available; the Dio interceptor will retry later.
        }
      } else {
        AuthTokenStore.instance.clear();
      }
      if (!mounted) return;
      final current = ref.read(authStateProvider);
      final displayName = state.user?.name;
      final email = state.user?.email;
      if (current.signedIn != signedIn ||
          current.displayName != displayName ||
          current.email != email) {
        ref.read(authStateProvider.notifier).state = current.copyWith(
          signedIn: signedIn,
          displayName: displayName,
          email: email,
        );
      }
    });
  }

  @override
  void dispose() {
    _authState?.removeListener(_onAuthChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
