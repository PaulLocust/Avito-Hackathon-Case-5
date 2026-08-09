import { Link } from 'react-router-dom';

import type { RiskSignalRef } from '../../api/types';

/** Ссылка на карточку признака риска в справочнике (FR16, FR29). */
export function RiskSignalLink({ signal }: { signal: RiskSignalRef }) {
  return <Link to={`/signals/${encodeURIComponent(signal.code)}`}>{signal.title}</Link>;
}
