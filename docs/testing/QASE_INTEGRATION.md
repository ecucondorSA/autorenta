# Integración de Qase con Playwright

Este proyecto está configurado para reportar automáticamente los resultados de las pruebas E2E a [Qase.io](https://qase.io/).

## Requisitos Previos

1.  Tener una cuenta en Qase.io.
2.  Tener acceso al proyecto en Qase.

## Configuración

Para habilitar el reporte, necesitas configurar las siguientes variables de entorno. Puedes agregarlas a tu archivo `.env` local (no versionado) o exportarlas en tu terminal.

```bash
# Código del proyecto en Qase (ej. AUTORENTA)
export QASE_PROJECT_CODE="TU_CODIGO_DE_PROYECTO"

# Tu token de API personal (Obtenlo en: https://app.qase.io/user/api/token)
export QASE_API_TOKEN="tu_api_token_secreto"
```

## Ejecución

Una vez configuradas las variables, ejecuta las pruebas normalmente:

```bash
# Ejecutar todas las pruebas E2E
pnpm test:e2e

# Ejecutar pruebas específicas
pnpm test:e2e --grep "nombre del test"
```

El reporter detectará automáticamente las variables de entorno y enviará los resultados a Qase. Si las variables no están presentes, el reporter de Qase se desactivará y solo verás los resultados en la consola y en el reporte HTML local.

## CI/CD

En GitHub Actions, asegúrate de agregar `QASE_PROJECT_CODE` y `QASE_API_TOKEN` a los secretos del repositorio para que los reportes se generen automáticamente en cada ejecución del pipeline.
