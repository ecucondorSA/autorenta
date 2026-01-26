package app.autorentar;

import android.content.Context;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class AutonomousAgentWorker extends Worker {

    private static final String TAG = "AutonomousAgent";

    public AutonomousAgentWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.i(TAG, "🤖 Agente Autónomo: Iniciando diagnóstico de salud...");

        try {
            // 1. Verificar Conectividad General
            if (!isNetworkAvailable()) {
                Log.w(TAG, "⚠️ Sin conexión a internet. Pausando agente.");
                return Result.retry();
            }

            // 2. Health Check: API de Autos (Marketplace)
            // Simulamos lo que hace la app al abrir: buscar autos disponibles
            long startTime = System.currentTimeMillis();
            boolean apiHealthy = checkMarketplaceHealth();
            long duration = System.currentTimeMillis() - startTime;

            if (apiHealthy) {
                Log.i(TAG, "✅ Marketplace API: OK (" + duration + "ms)");
            } else {
                Log.e(TAG, "❌ Marketplace API: FALLÓ o LENTO (" + duration + "ms)");
                // Aquí podrías agregar una notificación local avisando al usuario
            }

            return Result.success();
        } catch (Exception e) {
            Log.e(TAG, "❌ Error crítico en Agente", e);
            return Result.retry();
        }
    }

    private boolean checkMarketplaceHealth() {
        try {
            // URL real de tu proyecto Supabase (tomada de environment.ts)
            java.net.URL url = new java.net.URL("https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/cars?select=id&status=eq.active&limit=1");
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4"); // Anon key real
            conn.setRequestProperty("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3ODMsImV4cCI6MjA3ODA1ODc4M30.wE2jTut2JSexoKFtHdEaIpl9MZ0sOHy9zMYBbhFbzt4");
            conn.setConnectTimeout(10000); // 10s timeout
            conn.setReadTimeout(10000);

            int status = conn.getResponseCode();
            return status >= 200 && status < 300;
        } catch (Exception e) {
            Log.e(TAG, "Health Check Failed", e);
            return false;
        }
    }

    private boolean isNetworkAvailable() {
        android.net.ConnectivityManager cm =
            (android.net.ConnectivityManager) getApplicationContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        return cm.getActiveNetworkInfo() != null && cm.getActiveNetworkInfo().isConnected();
    }
}
