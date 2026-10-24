import 'package:flutter/material.dart';
import 'package:openear/main.dart' show routeObserver;
import 'package:openear/screens/home_page.dart';

// Portfolio recording build of OpenEar. Firebase is used only for signing in,
// so this build starts on the home screen without it; notes, quizzes and
// progress are stored on the device exactly as the app does on the web.
// Build: flutter build web -t preview_offline.dart

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MaterialApp(
      title: 'OpenEar',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFF384A5F),
        primaryColor: const Color(0xFF90AFC5),
        textTheme: const TextTheme(
          bodyLarge: TextStyle(fontSize: 22.0, color: Colors.white),
          bodyMedium: TextStyle(fontSize: 18.0, color: Colors.white70),
        ),
      ),
      home: const HomePage(),
      navigatorObservers: [routeObserver],
    ),
  );
}
