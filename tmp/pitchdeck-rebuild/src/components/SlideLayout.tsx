import React from 'react';

interface SlideLayoutProps {
  children: React.ReactNode;
  centered?: boolean;
  className?: string;
}

export function SlideLayout({ children, centered, className = '' }: SlideLayoutProps) {
  return (
    <div className={`slide ${centered ? 'slide--centered' : ''} ${className}`}>
      {children}
      <div className="diamond" />
    </div>
  );
}

interface SlideHeaderProps {
  tag?: string;
  title: string;
  subtitle?: string;
  smallTitle?: boolean;
}

export function SlideHeader({ tag, title, subtitle, smallTitle }: SlideHeaderProps) {
  return (
    <header>
      {tag && <div className="slide-tag">{tag}</div>}
      <h1 className={`slide-title ${smallTitle ? 'slide-title--small' : ''}`}>{title}</h1>
      {subtitle && <p className="slide-subtitle">{subtitle}</p>}
    </header>
  );
}

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: boolean;
};

export function Card({ children, accent, className = '', ...rest }: CardProps) {
  return (
    <div className={`card ${accent ? 'card--accent' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  yellow?: boolean;
}

export function Metric({ label, value, yellow }: MetricProps) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${yellow ? 'metric-value--yellow' : ''}`}>{value}</span>
    </div>
  );
}
