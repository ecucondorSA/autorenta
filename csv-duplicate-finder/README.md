# 🔍 Buscador de Duplicados CSV

Aplicación web Flask que permite identificar filas duplicadas en archivos CSV de forma rápida y sencilla.

## ✨ Características

- ✅ **Detección completa de duplicados**: Identifica **todas** las filas que forman parte de un conjunto duplicado, no solo las segundas ocurrencias
- 📊 **Estadísticas detalladas**: Muestra total de filas, duplicados, únicas y grupos de duplicados
- 💾 **Descarga de resultados**: Descarga un CSV con solo las filas duplicadas
- 🔄 **Soporte múltiple de codificaciones**: Maneja automáticamente UTF-8, Latin-1, ISO-8859-1 y CP1252
- 🎨 **Interfaz moderna**: Diseño limpio y responsive
- ⚡ **Procesamiento eficiente**: Usa Pandas para análisis rápido de grandes archivos

## 🚀 Instalación

1. **Clonar o navegar al directorio del proyecto**:
```bash
cd csv-duplicate-finder
```

2. **Crear entorno virtual** (recomendado):
```bash
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. **Instalar dependencias**:
```bash
pip install -r requirements.txt
```

## 📖 Uso

1. **Iniciar la aplicación**:
```bash
python app.py
```

2. **Abrir en el navegador**:
```
http://localhost:5000
```

3. **Subir un archivo CSV**:
   - Haz clic en "Seleccionar archivo CSV"
   - Elige tu archivo
   - Haz clic en "Procesar Archivo"

4. **Ver resultados**:
   - Revisa las estadísticas
   - Visualiza las tablas de duplicados y datos originales
   - Descarga el CSV con solo los duplicados

## 📁 Estructura del Proyecto

```
csv-duplicate-finder/
├── app.py                 # Aplicación Flask principal
├── requirements.txt        # Dependencias Python
├── README.md              # Este archivo
├── templates/
│   ├── index.html        # Página principal (subir archivo)
│   └── results.html      # Página de resultados
├── static/
│   └── css/
│       └── style.css     # Estilos CSS
└── uploads/              # Carpeta para archivos subidos (se crea automáticamente)
```

## 🔧 Configuración

### Variables de Entorno (Opcional)

Para producción, configura una clave secreta segura:

```bash
export SECRET_KEY='tu-clave-secreta-muy-segura-aqui'
```

O crea un archivo `.env` (requiere `python-dotenv`):

```bash
SECRET_KEY=tu-clave-secreta-muy-segura-aqui
```

### Límites de Archivo

El tamaño máximo de archivo está configurado en 16MB. Para cambiarlo, edita `app.py`:

```python
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
```

## 🛠️ Funcionalidades Técnicas

### Detección de Duplicados

La aplicación usa `pandas.DataFrame.duplicated(keep=False)` para marcar **todas** las filas que tienen duplicados, no solo las segundas ocurrencias. Esto significa que si las filas 1, 5 y 10 son idénticas, las tres serán marcadas como duplicadas.

### Manejo de Codificaciones

La aplicación intenta automáticamente las siguientes codificaciones en orden:
1. UTF-8
2. Latin-1 (ISO-8859-1)
3. ISO-8859-1
4. CP1252

### Sesión de Usuario

Los datos se almacenan en la sesión de Flask como JSON para permitir:
- Descarga del CSV de duplicados en una petición separada
- Navegación entre páginas sin perder datos
- Limpieza manual de la sesión

## 🐛 Solución de Problemas

### Error: "No se pudo leer el archivo CSV"
- Verifica que el archivo sea un CSV válido
- Comprueba que no esté corrupto
- Asegúrate de que tenga columnas definidas

### Error: "El archivo CSV está vacío"
- Verifica que el archivo tenga datos
- Asegúrate de que no sea solo una fila de encabezados

### La aplicación no inicia
- Verifica que Python 3.7+ esté instalado
- Confirma que todas las dependencias están instaladas: `pip install -r requirements.txt`
- Revisa que el puerto 5000 esté disponible

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Soporte

Si encuentras algún problema o tienes sugerencias, por favor abre un issue en el repositorio.

---

Hecho con ❤️ usando Flask y Pandas

