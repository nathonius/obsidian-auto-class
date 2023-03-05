import { setIcon } from 'obsidian';
import { FunctionComponent } from 'preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { html } from '../util';

export const IconButton: FunctionComponent<unknown & { icon: string; type: string }> = (props) => {
  const { icon, children, type = 'button', ...buttonProps } = props;
  const host = useRef<HTMLButtonElement>(null);
  const restProps = useMemo(() => {
    const rest = { ...buttonProps };
    if (typeof children === 'string') {
      (rest as any)['aria-label'] = children;
    }
    return rest;
  }, [children, buttonProps]);

  useEffect(() => {
    if (host.current) {
      setIcon(host.current, icon);
    }
  }, [icon]);

  return html`<button ref=${host} type=${type} ...${restProps}></button>`;
};
