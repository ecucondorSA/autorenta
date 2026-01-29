# ProGuard rules for AutoRenta (Capacitor + Ionic)
# https://capacitorjs.com/docs/android/troubleshooting

# ============================================
# CRITICAL: Keep MainActivity and Application
# ============================================
-keep class app.autorentar.** { *; }
-keep class app.autorenta.io.** { *; }

# ============================================
# CAPACITOR CORE
# ============================================
# Keep all Capacitor classes
-keep public class * extends com.getcapacitor.Plugin
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# Keep BridgeActivity (parent of MainActivity)
-keep class com.getcapacitor.BridgeActivity { *; }

# Keep annotations used by Capacitor
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# ============================================
# CAPACITOR PLUGINS
# ============================================
# Local Notifications
-keep class com.capacitorjs.plugins.localnotifications.** { *; }

# Push Notifications
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }

# Biometric Authentication
-keep class ee.forgr.biometric.** { *; }

# All Capacitor plugins (catch-all)
-keep class com.capacitorjs.plugins.** { *; }

# ============================================
# SENTRY
# ============================================
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# ============================================
# FIREBASE
# ============================================
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# ============================================
# FACEBOOK SDK
# ============================================
-keep class com.facebook.** { *; }
-dontwarn com.facebook.**

# ============================================
# WEBVIEW & JAVASCRIPT INTERFACE
# ============================================
# Keep JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView related classes
-keepclassmembers class * extends android.webkit.WebView {
    public *;
}

# ============================================
# NATIVE LIBRARIES
# ============================================
# Prevent stripping of native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# ============================================
# SERIALIZATION / JSON
# ============================================
# Keep fields for JSON serialization
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Keep Enum values
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
# REFLECTION
# ============================================
# Keep classes accessed via reflection
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================
# DEBUGGING
# ============================================
# Keep source file and line numbers for stack traces
-keepattributes SourceFile,LineNumberTable

# Hide original source file name (optional security)
-renamesourcefileattribute SourceFile

# ============================================
# SUPPRESS WARNINGS
# ============================================
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn okhttp3.**
-dontwarn retrofit2.**
