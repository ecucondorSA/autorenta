# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# =============================================================================
# CAPACITOR RULES - Required for WebView to work correctly in release builds
# =============================================================================

# Keep Capacitor Bridge classes
-keep class com.getcapacitor.** { *; }
-keep class com.capacitor.** { *; }
-dontwarn com.getcapacitor.**

# Keep Capacitor plugins
-keep class * extends com.getcapacitor.Plugin { *; }

# Keep JavaScript interface for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep classes used by Capacitor's WebView bridge
-keepclassmembers class * extends android.webkit.WebViewClient { *; }
-keepclassmembers class * extends android.webkit.WebChromeClient { *; }

# Keep Cordova classes (used by some Capacitor plugins)
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# =============================================================================
# IONIC RULES
# =============================================================================
-keep class com.ionicframework.** { *; }
-dontwarn com.ionicframework.**

# =============================================================================
# FACEBOOK SDK RULES
# =============================================================================
-keep class com.facebook.** { *; }
-dontwarn com.facebook.**

# =============================================================================
# SENTRY RULES
# =============================================================================
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# =============================================================================
# GENERAL ANDROID RULES
# =============================================================================

# Keep WebView related classes
-keepclassmembers class * extends android.webkit.WebView {
    public *;
}

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# Preserve line numbers for debugging (recommended)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Parcelables
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    !private <fields>;
    !private <methods>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
