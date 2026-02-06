# 🎬 AutoRenta Video Studio (Remotion)

Esta aplicación genera videos programáticos utilizando **React** y **Remotion**.

## 🚀 Comandos

### Previsualizar (Desarrollo)
Abre el editor visual de Remotion en el navegador.
```bash
pnpm start
```

### Renderizar Video (Producción)
Genera un archivo MP4 en la carpeta `out/`.
```bash
pnpm build
```

## 📁 Estructura

- `src/compositions/`: Aquí viven las plantillas de video.
- `src/Root.tsx`: Registro de composiciones disponibles.
- `src/index.ts`: Punto de entrada de Remotion.

## 🛠️ Integración con AutoRenta

Para integrar esto con la app principal (Angular), se recomienda:

1.  **Modo API:** Desplegar este proyecto en **Remotion Lambda** o **Google Cloud Run**.
2.  **Llamada:** Desde Angular/Supabase, hacer una petición HTTP POST al servicio de renderizado con las props (nombre del auto, precio, foto).
3.  **Resultado:** El servicio devuelve la URL del video generado.
