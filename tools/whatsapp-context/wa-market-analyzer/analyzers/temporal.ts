/**
 * Temporal Analysis - Message patterns over time
 */
import { getDb } from "../lib/db";
import { getBiasFilterClause } from "../lib/filters";

export interface HourlyDistribution {
  hour: number;
  count: number;
  percentage: number;
}

export interface DailyDistribution {
  day: number;
  dayName: string;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  yearMonth: string;
  count: number;
}

export interface PeakWindow {
  startHour: number;
  endHour: number;
  peakCount: number;
  description: string;
}

export interface TemporalReport {
  generatedAt: string;
  totalMessages: number;
  dateRange: {
    earliest: string;
    latest: string;
    totalDays: number;
  };
  hourlyDistribution: HourlyDistribution[];
  dailyDistribution: DailyDistribution[];
  monthlyTrend: MonthlyTrend[];
  peakWindows: PeakWindow[];
  insights: string[];
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/**
 * Analyze temporal patterns in messages
 */
export function analyzeTemporal(): TemporalReport {
  const db = getDb();
  const biasFilter = getBiasFilterClause();

  // Get total messages
  const totalQuery = `
    SELECT COUNT(*) as count FROM message
    WHERE text_data IS NOT NULL AND ${biasFilter}
  `;
  const totalResult = db.query<{ count: number }, []>(totalQuery).get();
  const totalMessages = totalResult?.count ?? 0;

  // Get date range
  const dateRangeQuery = `
    SELECT
      MIN(datetime(timestamp/1000, 'unixepoch', 'localtime')) as earliest,
      MAX(datetime(timestamp/1000, 'unixepoch', 'localtime')) as latest,
      CAST((MAX(timestamp) - MIN(timestamp)) / 1000 / 86400 AS INTEGER) as totalDays
    FROM message
    WHERE text_data IS NOT NULL AND ${biasFilter}
  `;
  const dateRangeResult = db.query<{ earliest: string; latest: string; totalDays: number }, []>(dateRangeQuery).get();
  const dateRange = {
    earliest: dateRangeResult?.earliest ?? "",
    latest: dateRangeResult?.latest ?? "",
    totalDays: dateRangeResult?.totalDays ?? 0,
  };

  // Hourly distribution
  const hourlyQuery = `
    SELECT
      CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
      COUNT(*) as count
    FROM message
    WHERE text_data IS NOT NULL AND ${biasFilter}
    GROUP BY hour
    ORDER BY hour
  `;
  const hourlyRaw = db.query<{ hour: number; count: number }, []>(hourlyQuery).all();
  const hourlyDistribution: HourlyDistribution[] = hourlyRaw.map(h => ({
    hour: h.hour,
    count: h.count,
    percentage: Math.round((h.count / totalMessages) * 10000) / 100,
  }));

  // Daily distribution (0=Sunday, 1=Monday, etc.)
  const dailyQuery = `
    SELECT
      CAST(strftime('%w', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) as day,
      COUNT(*) as count
    FROM message
    WHERE text_data IS NOT NULL AND ${biasFilter}
    GROUP BY day
    ORDER BY day
  `;
  const dailyRaw = db.query<{ day: number; count: number }, []>(dailyQuery).all();
  const dailyDistribution: DailyDistribution[] = dailyRaw.map(d => ({
    day: d.day,
    dayName: DAY_NAMES[d.day],
    count: d.count,
    percentage: Math.round((d.count / totalMessages) * 10000) / 100,
  }));

  // Monthly trend
  const monthlyQuery = `
    SELECT
      strftime('%Y-%m', datetime(timestamp/1000, 'unixepoch', 'localtime')) as yearMonth,
      COUNT(*) as count
    FROM message
    WHERE text_data IS NOT NULL AND ${biasFilter}
    GROUP BY yearMonth
    ORDER BY yearMonth
  `;
  const monthlyTrend = db.query<MonthlyTrend, []>(monthlyQuery).all();

  // Identify peak windows
  const peakWindows: PeakWindow[] = [];

  // Find peak hour
  const peakHour = hourlyDistribution.reduce((max, h) => h.count > max.count ? h : max);
  peakWindows.push({
    startHour: peakHour.hour,
    endHour: (peakHour.hour + 1) % 24,
    peakCount: peakHour.count,
    description: `Hora pico: ${peakHour.hour}:00 - ${(peakHour.hour + 1) % 24}:00`,
  });

  // Find extended peak window (consecutive hours above average)
  const avgHourly = totalMessages / 24;
  let windowStart = -1;
  let windowEnd = -1;
  let windowCount = 0;
  let maxWindowCount = 0;
  let maxWindowStart = -1;
  let maxWindowEnd = -1;

  for (let i = 0; i < 24; i++) {
    const hourData = hourlyDistribution.find(h => h.hour === i);
    const count = hourData?.count ?? 0;

    if (count > avgHourly * 1.2) {
      if (windowStart === -1) windowStart = i;
      windowEnd = i;
      windowCount += count;
    } else {
      if (windowCount > maxWindowCount) {
        maxWindowCount = windowCount;
        maxWindowStart = windowStart;
        maxWindowEnd = windowEnd;
      }
      windowStart = -1;
      windowEnd = -1;
      windowCount = 0;
    }
  }

  if (maxWindowStart !== -1) {
    peakWindows.push({
      startHour: maxWindowStart,
      endHour: maxWindowEnd + 1,
      peakCount: maxWindowCount,
      description: `Ventana de alta actividad: ${maxWindowStart}:00 - ${maxWindowEnd + 1}:00`,
    });
  }

  // Generate insights
  const insights: string[] = [];

  // Peak day insight
  const peakDay = dailyDistribution.reduce((max, d) => d.count > max.count ? d : max);
  insights.push(`${peakDay.dayName} es el día más activo con ${peakDay.count.toLocaleString()} mensajes (${peakDay.percentage}%)`);

  // Morning vs afternoon
  const morningHours = hourlyDistribution.filter(h => h.hour >= 6 && h.hour < 12);
  const afternoonHours = hourlyDistribution.filter(h => h.hour >= 12 && h.hour < 18);
  const morningCount = morningHours.reduce((sum, h) => sum + h.count, 0);
  const afternoonCount = afternoonHours.reduce((sum, h) => sum + h.count, 0);

  if (afternoonCount > morningCount * 1.3) {
    insights.push(`Tarde (12-18h) tiene ${Math.round((afternoonCount / morningCount - 1) * 100)}% más actividad que la mañana`);
  }

  // Weekend vs weekday
  const weekendDays = dailyDistribution.filter(d => d.day === 0 || d.day === 6);
  const weekdayDays = dailyDistribution.filter(d => d.day >= 1 && d.day <= 5);
  const weekendAvg = weekendDays.reduce((sum, d) => sum + d.count, 0) / 2;
  const weekdayAvg = weekdayDays.reduce((sum, d) => sum + d.count, 0) / 5;

  if (weekdayAvg > weekendAvg * 1.2) {
    insights.push(`Días hábiles tienen ${Math.round((weekdayAvg / weekendAvg - 1) * 100)}% más actividad que fines de semana`);
  }

  // Growth trend
  if (monthlyTrend.length >= 3) {
    const lastThree = monthlyTrend.slice(-3);
    const firstThree = monthlyTrend.slice(0, 3);
    const recentAvg = lastThree.reduce((sum, m) => sum + m.count, 0) / 3;
    const earlyAvg = firstThree.reduce((sum, m) => sum + m.count, 0) / 3;

    if (recentAvg > earlyAvg * 1.5) {
      insights.push(`Actividad ha crecido ${Math.round((recentAvg / earlyAvg - 1) * 100)}% comparando últimos 3 meses vs primeros 3`);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalMessages,
    dateRange,
    hourlyDistribution,
    dailyDistribution,
    monthlyTrend,
    peakWindows,
    insights,
  };
}
