package app.autorentar.baselineprofile

import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Baseline Profile Generator for AutoRenta
 *
 * This generates a baseline profile that optimizes app startup and common user journeys.
 * The profile is compiled ahead-of-time, reducing JIT compilation at runtime.
 *
 * To generate profiles:
 * 1. Connect a physical device (emulators work but produce less accurate profiles)
 * 2. Run: ./gradlew :baselineprofile:connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.androidx.benchmark.enabledRules=BaselineProfile
 * 3. The profile will be copied to app/src/main/baseline-prof.txt
 *
 * Expected improvement: 15-30% faster cold startup
 */
@RunWith(AndroidJUnit4::class)
@LargeTest
class BaselineProfileGenerator {

    @get:Rule
    val rule = BaselineProfileRule()

    @Test
    fun generate() {
        rule.collect(
            packageName = "app.autorentar",
            includeInStartupProfile = true
        ) {
            // === COLD START ===
            // Measure the critical startup path
            pressHome()
            startActivityAndWait()

            // Wait for WebView to initialize and load initial content
            device.waitForIdle()
            Thread.sleep(3000)

            // === COMMON USER JOURNEY: Browse Cars ===
            // Simulate scrolling through the car list (most common action)
            repeat(3) {
                device.swipe(
                    device.displayWidth / 2,
                    device.displayHeight * 3 / 4,
                    device.displayWidth / 2,
                    device.displayHeight / 4,
                    15 // steps (slower = more realistic)
                )
                device.waitForIdle()
                Thread.sleep(500)
            }

            // Scroll back up
            device.swipe(
                device.displayWidth / 2,
                device.displayHeight / 4,
                device.displayWidth / 2,
                device.displayHeight * 3 / 4,
                15
            )
            device.waitForIdle()
        }
    }
}
