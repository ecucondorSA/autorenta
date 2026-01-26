package app.autorentar;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);

        // Ajustar el padding para evitar que el contenido se superponga con las barras del sistema
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        // Enable WebView debugging for Chrome DevTools
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // 🤖 Iniciar Agente Autónomo (WorkManager)
        // Se ejecuta cada 15 minutos (mínimo permitido por Android)
        try {
            PeriodicWorkRequest agentRequest =
                new PeriodicWorkRequest.Builder(AutonomousAgentWorker.class, 15, TimeUnit.MINUTES)
                    .addTag("autonomous_agent")
                    .build();

            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "AutonomousAgentWork",
                ExistingPeriodicWorkPolicy.KEEP, // KEEP ignora si ya existe, REPLACE lo reinicia
                agentRequest);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
