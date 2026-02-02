# ProGuard/R8 Rules for AutoRenta (Capacitor + Ionic)
# Optimized for R8 full mode - 2026-01-30
# https://capacitorjs.com/docs/android/troubleshooting

# ============================================
# AUTORENTAR APPLICATION
# ============================================
# Only keep MainActivity (required entry point)
-keep class app.autorentar.MainActivity { *; }

# ============================================
# CAPACITOR CORE (minimum required)
# ============================================
# Keep plugin methods annotated with @PluginMethod
-keep public class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}

# Core Capacitor classes needed at runtime
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.JSObject { *; }
-keep class com.getcapacitor.PluginCall { *; }
-keep class com.getcapacitor.PluginResult { *; }

# Capacitor annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# ============================================
# CAPACITOR PLUGINS (specific classes only)
# ============================================
# Local Notifications - keep handlers
-keep class com.capacitorjs.plugins.localnotifications.LocalNotificationIntentReceiver { *; }

# Push Notifications - keep Firebase integration
-keep class com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin { *; }

# ============================================
# SENTRY (official recommended rules)
# ============================================
# Keep Sentry Android core for crash reporting
-keep class io.sentry.android.core.** { *; }
-keep class io.sentry.SentryOptions { *; }
-keep class io.sentry.protocol.** { *; }
-keep class io.sentry.Breadcrumb { *; }
-keep class io.sentry.SentryEvent { *; }
# Keep for stack trace symbolication
-keepattributes LineNumberTable,SourceFile
-dontwarn io.sentry.**

# ============================================
# FIREBASE (only messaging)
# ============================================
# Keep Firebase Cloud Messaging
-keep class com.google.firebase.messaging.FirebaseMessagingService { *; }
-keep class com.google.firebase.messaging.RemoteMessage { *; }
-keep class com.google.firebase.iid.FirebaseInstanceId { *; }
# Suppress warnings for unused Firebase modules
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ============================================
# FACEBOOK SDK (only analytics and login)
# ============================================
# Keep App Events for analytics
-keep class com.facebook.appevents.AppEventsLogger { *; }
-keep class com.facebook.appevents.AppEventsConstants { *; }
# Keep Facebook SDK initialization
-keep class com.facebook.FacebookSdk { *; }
-keep class com.facebook.FacebookContentProvider { *; }
# Keep Login functionality
-keep class com.facebook.login.LoginManager { *; }
-keep class com.facebook.AccessToken { *; }
-dontwarn com.facebook.**

# ============================================
# WEBVIEW & JAVASCRIPT INTERFACE
# ============================================
# Keep all JavaScript interfaces (critical for Capacitor)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView methods accessed via reflection
-keepclassmembers class * extends android.webkit.WebView {
    public *;
}

# ============================================
# NATIVE METHODS
# ============================================
# Prevent stripping of native method bindings
-keepclasseswithmembernames class * {
    native <methods>;
}

# ============================================
# SERIALIZATION
# ============================================
# Keep Gson serialization fields
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Keep Enum values for serialization
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ============================================
# PARCELABLE
# ============================================
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ============================================
# DEBUGGING & STACK TRACES
# ============================================
# Keep source file and line numbers for readable crash reports
-keepattributes SourceFile,LineNumberTable
# Rename source file for security (optional obfuscation)
-renamesourcefileattribute SourceFile

# ============================================
# SUPPRESS WARNINGS
# ============================================
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn okhttp3.internal.platform.**
-dontwarn retrofit2.**
