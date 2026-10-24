import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hydro_tracker/repositories/settings_repository.dart';
import 'package:hydro_tracker/screens/dashboard_screen.dart';
import 'package:hydro_tracker/screens/sign_in_screen.dart';
import 'package:hydro_tracker/screens/splash_screen.dart';
import 'package:hydro_tracker/state/environment_theme.dart';
import 'package:hydro_tracker/theme/app_theme.dart';

// Portfolio recording build of Hydro-Tracker, run without its cloud account
// service (the Supabase project no longer exists). The app keeps its data on
// the device when nobody is signed in, so it runs as written; this file only
//  - points the Supabase client at the coach function running on this Mac
//    (supabase/functions/coach/index.ts, started with my own Groq key), and
//  - steps past the sign-in screen straight to the dashboard.
// Build: flutter build web -t preview_offline.dart

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: 'http://127.0.0.1:8000',
    // ignore: deprecated_member_use
    anonKey: 'local-coach',
  );
  final settings = SettingsRepository();
  await settings.load();
  environmentThemeIndex.value = settings.settings.themeIndex;
  runApp(
    MaterialApp(
      title: 'Hydro Tracker',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      navigatorObservers: [SkipSignIn()],
      home: const SplashScreen(),
    ),
  );
}

/// When the app would show sign-in, go to the dashboard instead.
class SkipSignIn extends NavigatorObserver {
  void _check(Route<dynamic>? route) {
    final nav = navigator;
    if (nav == null || route is! MaterialPageRoute) return;
    if (route.builder(nav.context) is! SignInScreen) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      nav.pushReplacement(
        MaterialPageRoute(builder: (_) => const DashboardScreen()),
      );
    });
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _check(route);

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) =>
      _check(newRoute);
}
