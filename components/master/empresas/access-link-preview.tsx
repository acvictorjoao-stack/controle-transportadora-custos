'use client';

import {buildAccessLinks} from '@/features/master/provisioning/utils/access-url';
import {cn} from '@/lib/utils';

export interface AccessLinkPreviewProps {
  slug: string;
  className?: string;
}

function AccessLinkPreview({slug, className}: AccessLinkPreviewProps) {
  const links = buildAccessLinks(slug);

  return (
    <div className={cn('space-y-1 text-xs text-muted-foreground', className)}>
      <p>
        URL:{' '}
        <span className="font-mono text-foreground">{links.path}</span>
      </p>
      <p>
        Subdomínio:{' '}
        <span className="font-mono text-foreground">{links.subdomain}</span>
      </p>
    </div>
  );
}

export {AccessLinkPreview};
