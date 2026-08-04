// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TruncatedTextProps extends React.ComponentProps<'span'> {
  /** Tooltip content; defaults to `children` when the text overflows. */
  tooltip?: React.ReactNode;
}

/**
 * Renders text that may be visually truncated (e.g. with the `truncate` class) and
 * shows a tooltip with the full content only when it is actually cut off.
 * Pair with a width/overflow-constraining className such as `truncate sm:w-96`.
 */
export function TruncatedText({ children, tooltip, ...props }: Readonly<TruncatedTextProps>) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  const checkTruncation = React.useCallback(() => {
    const el = ref.current;
    if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span ref={ref} onPointerEnter={checkTruncation} onFocus={checkTruncation} {...props}>
          {' '}
          {children}
        </span>
      </TooltipTrigger>
      {isTruncated && <TooltipContent>{tooltip ?? children}</TooltipContent>}
    </Tooltip>
  );
}
