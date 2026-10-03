import { APP_NAME, APP_TAGLINE, APP_TAGLINE_SHORT } from '../../lib/brand';

export type BrandProps = {
  tagline?: boolean | 'short';
  titleAs?: 'h1' | 'span';
  className?: string;
};

export function Brand({
  tagline = false,
  titleAs: Title = 'span',
  className = '',
}: BrandProps) {
  const tag =
    tagline === 'short' ? APP_TAGLINE_SHORT : tagline ? APP_TAGLINE : null;

  return (
    <div className={`ui-brand ${className}`.trim()}>
      <Title className="ui-brand-name">{APP_NAME}</Title>
      {tag && <span className="ui-brand-tagline">{tag}</span>}
    </div>
  );
}
