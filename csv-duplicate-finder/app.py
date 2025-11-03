from flask import Flask, render_template, request, redirect, url_for, session, send_file, flash
import pandas as pd
import os
import json
import io
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

@app.route('/')
def index():
    """Página principal para subir archivo CSV"""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Procesa el archivo CSV subido y encuentra duplicados"""
    if 'file' not in request.files:
        flash('No se proporcionó ningún archivo', 'error')
        return redirect(url_for('index'))
    
    file = request.files['file']
    
    if file.filename == '':
        flash('No se seleccionó ningún archivo', 'error')
        return redirect(url_for('index'))
    
    if not file.filename.endswith('.csv'):
        flash('El archivo debe ser un CSV (.csv)', 'error')
        return redirect(url_for('index'))
    
    try:
        # Leer CSV con manejo de diferentes codificaciones
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        df = None
        encoding_used = None
        
        for encoding in encodings:
            try:
                file.seek(0)  # Resetear posición del archivo
                df = pd.read_csv(file, encoding=encoding)
                encoding_used = encoding
                break
            except (UnicodeDecodeError, pd.errors.ParserError):
                continue
        
        if df is None:
            flash('No se pudo leer el archivo CSV. Verifique la codificación.', 'error')
            return redirect(url_for('index'))
        
        # Validar que el DataFrame no esté vacío
        if df.empty:
            flash('El archivo CSV está vacío', 'error')
            return redirect(url_for('index'))
        
        # Validar que hay columnas
        if len(df.columns) == 0:
            flash('El archivo CSV no tiene columnas válidas', 'error')
            return redirect(url_for('index'))
        
        # Almacenar en sesión como JSON (orient='split' es más eficiente)
        session['original_df'] = df.to_json(orient='split', date_format='iso')
        session['filename'] = file.filename
        session['encoding'] = encoding_used
        
        # Identificar TODOS los duplicados (keep=False marca todas las ocurrencias)
        duplicates = df[df.duplicated(keep=False)]
        session['duplicates_df'] = duplicates.to_json(orient='split', date_format='iso')
        
        # Estadísticas para mostrar
        total_rows = len(df)
        duplicate_rows = len(duplicates)
        unique_rows = len(df.drop_duplicates())  # Filas únicas (sin duplicados)
        duplicate_groups = len(duplicates.drop_duplicates()) if duplicate_rows > 0 else 0
        
        session['stats'] = {
            'total_rows': total_rows,
            'duplicate_rows': duplicate_rows,
            'unique_rows': unique_rows,
            'duplicate_groups': duplicate_groups
        }
        
        return render_template('results.html', 
                             original_data=df.to_html(classes='table table-striped', table_id='original-table'),
                             duplicate_data=duplicates.to_html(classes='table table-striped table-warning', table_id='duplicate-table'),
                             stats=session['stats'],
                             has_duplicates=duplicate_rows > 0)
    
    except pd.errors.EmptyDataError:
        flash('El archivo CSV está vacío o no tiene datos válidos', 'error')
        return redirect(url_for('index'))
    except pd.errors.ParserError as e:
        flash(f'Error al parsear el CSV: {str(e)}', 'error')
        return redirect(url_for('index'))
    except Exception as e:
        flash(f'Error procesando el archivo: {str(e)}', 'error')
        return redirect(url_for('index'))

@app.route('/download')
def download_duplicates():
    """Descarga el CSV con solo las filas duplicadas"""
    if 'duplicates_df' not in session or not session['duplicates_df']:
        flash('No hay datos de duplicados disponibles. Por favor, suba un archivo primero.', 'error')
        return redirect(url_for('index'))
    
    try:
        # Recuperar DataFrame desde la sesión
        duplicates_json = json.loads(session['duplicates_df'])
        duplicates_df = pd.read_json(json.dumps(duplicates_json), orient='split')
        
        # Crear buffer en memoria para el CSV
        output = io.BytesIO()
        
        # Generar nombre de archivo con timestamp
        original_filename = session.get('filename', 'archivo.csv')
        base_name = os.path.splitext(original_filename)[0]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_filename = f'{base_name}_duplicados_{timestamp}.csv'
        
        # Escribir CSV al buffer
        encoding = session.get('encoding', 'utf-8')
        duplicates_df.to_csv(output, index=False, encoding=encoding)
        
        # Preparar para descarga
        output.seek(0)
        
        return send_file(
            output,
            mimetype='text/csv',
            as_attachment=True,
            download_name=output_filename
        )
    
    except json.JSONDecodeError:
        flash('Error al procesar los datos guardados. Por favor, suba el archivo nuevamente.', 'error')
        return redirect(url_for('index'))
    except Exception as e:
        flash(f'Error al generar el archivo de descarga: {str(e)}', 'error')
        return redirect(url_for('index'))

@app.route('/clear')
def clear_session():
    """Limpia la sesión y redirige a la página principal"""
    session.clear()
    flash('Sesión limpiada. Puede subir un nuevo archivo.', 'info')
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

