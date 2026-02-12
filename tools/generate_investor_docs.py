import os
import re

# Configuration
INVESTORS = [
    { "name": "Kamay Ventures", "contact": "Gabriela Ruggeri", "filename": "AutoRenta_OnePager_Kamay.html", "color": "#e11d48" },
    { "name": "Flourish Ventures", "contact": "Arjuna Costa", "filename": "AutoRenta_OnePager_Flourish.html", "color": "#059669" },
    { "name": "AngelHub", "contact": "José Luis Cimental", "filename": "AutoRenta_OnePager_AngelHub.html", "color": "#2563eb" }
]

SOURCE_FILE = "autorenta/docs/business/ONE_PAGER_INVESTOR_FINAL.md"
OUTPUT_DIR = "autorenta/docs/investors"

def simple_markdown(text):
    html = text
    html = re.sub(r'^# (.*$)', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*$)', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'^\* (.*$)', r'<li>\1</li>', html, flags=re.MULTILINE)
    
    lines = html.split('\n')
    new_lines = []
    in_list = False
    
    for line in lines:
        if line.startswith('<li>'):
            if not in_list:
                new_lines.append('<ul>')
                in_list = True
            new_lines.append(line)
        else:
            if in_list:
                new_lines.append('</ul>')
                in_list = False
            
            if line.strip() != '' and not line.startswith('<h') and not line.startswith('<u'):
                if line.startswith('---'):
                    new_lines.append('<hr>')
                else:
                    new_lines.append('<p>' + line + '</p>')
            else:
                new_lines.append(line)
                
    if in_list: new_lines.append('</ul>')
    return '\n'.join(new_lines)

def get_css(color):
    return """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; line-height: 1.5; color: #1f2937; max-width: 210mm; margin: 0 auto; padding: 40px; background: white; }
        h1 { font-size: 24pt; font-weight: 800; border-bottom: 2px solid COLOR_PLACEHOLDER; padding-bottom: 10px; margin-bottom: 20px; margin-top: 0; }
        h2 { font-size: 14pt; font-weight: 700; color: #111827; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-left: 4px solid COLOR_PLACEHOLDER; padding-left: 10px; }
        p { font-size: 10pt; margin-bottom: 10px; text-align: justify; color: #374151; }
        li { font-size: 10pt; margin-bottom: 5px; color: #374151; }
        ul { padding-left: 20px; margin-bottom: 15px; }
        hr { border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        .brand-tag { font-size: 9pt; font-weight: 600; color: COLOR_PLACEHOLDER; text-transform: uppercase; letter-spacing: 1px; }
        strong { color: #000; font-weight: 700; }
        .confidential-watermark { position: fixed; bottom: 10mm; right: 10mm; font-size: 8pt; color: #9ca3af; font-weight: 500; }
    </style>
    """.replace("COLOR_PLACEHOLDER", color)

def generate_docs():
    if not os.path.exists(SOURCE_FILE):
        print("Source file not found")
        return

    with open(SOURCE_FILE, "r") as f:
        md_content = f.read()

    html_body = simple_markdown(md_content)

    for investor in INVESTORS:
        html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
        html += "<title>One-Pager " + investor['name'] + "</title>"
        html += get_css(investor['color'])
        html += "</head><body>"
        
        html += "<div class='header-bar'>"
        html += "<div class='brand-tag'>PREPARED FOR " + investor['name'].upper() + "</div>"
        html += "<div style='font-size: 9pt; color: #6b7280;'>Attn: " + investor['contact'] + "</div>"
        html += "</div>"
        
        html += html_body
        
        html += "<div class='confidential-watermark'>CONFIDENTIAL - " + investor['name'].upper() + "</div>"
        html += "</body></html>"

        output_path = os.path.join(OUTPUT_DIR, investor['filename'])
        with open(output_path, "w") as f:
            f.write(html)
        
        print("Generated: " + output_path)

if __name__ == "__main__":
    generate_docs()
