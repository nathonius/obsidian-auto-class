import { setIcon } from 'obsidian';
import { FunctionComponent } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { html } from '../util';

export const Icon: FunctionComponent<{ icon: string; tooltip?: string }> = (props) => {
  const { icon, tooltip } = props;
  const host = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (host.current) {
      setIcon(host.current, icon);
    }
  }, [icon, tooltip]);

  const spanProps = tooltip ? { 'aria-label': tooltip } : {};

  return html`<span ref=${host} ...${spanProps}></span>`;
};
