#!/usr/bin/env bun

/**
 * Parser para archivos exportados de WhatsApp (.txt)
 *
 * Uso:
 *   bun parse-exported-chat.ts <archivo.txt>
 */

interface Message {
  date: string;
  time: string;
  sender: string;
  text: string;
}

function parseWhatsAppExport(content: string): Message[] {
  const messages: Message[] = [];

  // Formato típico de WhatsApp:
  // 04/02/2026, 22:30 - Juan: Hola, cómo están?
  // o
  // [04/02/2026, 22:30:15] Juan: Hola

  const lineRegex = /^[\[\]]?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)[\]\s]*[-:]\s+([^:]+):\s*(.*)$/;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    const match = line.match(lineRegex);

    if (match) {
      const [, date, time, sender, text] = match;

      messages.push({
        date: date.trim(),
        time: time.trim(),
        sender: sender.trim(),
        text: text.trim()
      });
    } else {
      // Es una continuación del mensaje anterior
      if (messages.length > 0) {
        messages[messages.length - 1].text += '\n' + line;
      }
    }
  }

  return messages;
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Uso: bun parse-exported-chat.ts <archivo.txt>');
    process.exit(1);
  }

  try {
    const content = await Bun.file(filePath).text();
    const messages = parseWhatsAppExport(content);

    console.log(`\n📊 Estadísticas del Chat\n`);
    console.log(`Total de mensajes: ${messages.length}`);

    // Contar mensajes por sender
    const senderCounts: Record<string, number> = {};
    for (const msg of messages) {
      senderCounts[msg.sender] = (senderCounts[msg.sender] || 0) + 1;
    }

    console.log(`\nParticipantes:`);
    for (const [sender, count] of Object.entries(senderCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${sender}: ${count} mensajes`);
    }

    console.log(`\n📝 Últimos 10 mensajes:\n`);
    messages.slice(-10).forEach(msg => {
      console.log(`[${msg.date} ${msg.time}] ${msg.sender}:`);
      console.log(`  ${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}\n`);
    });

    // Guardar en JSON
    const outputPath = filePath.replace(/\.txt$/, '.json');
    await Bun.write(outputPath, JSON.stringify(messages, null, 2));

    console.log(`✅ Guardado en: ${outputPath}`);

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
