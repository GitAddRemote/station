import { ReactNode } from 'react';
import AppShell from '../components/AppShell';
import './ComingSoon.css';

interface ComingSoonProps {
  active: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  description: string;
  features?: string[];
}

export default function ComingSoon({ active, icon, title, subtitle, description, features }: ComingSoonProps) {
  return (
    <AppShell active={active} searchPlaceholder={`Search ${title.toLowerCase()}…`}>
      <div className="cs-page">
        <div className="cs-card">
          <div className="cs-icon">{icon}</div>
          <div className="cs-badge">Coming soon</div>
          <h1 className="cs-title">{title}</h1>
          <p className="cs-sub">{subtitle}</p>
          <p className="cs-desc">{description}</p>
          {features && features.length > 0 && (
            <ul className="cs-features">
              {features.map((f) => (
                <li key={f}><span className="cs-dot" />{f}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
