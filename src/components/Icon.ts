import { setIcon } from 'obsidian';
import { FunctionComponent } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { html } from '../util';

export const Icon: FunctionComponent<unknown & { icon: string; tooltip?: string; class?: string }> = (props) => {
  const { icon, tooltip, ...restProps } = props;
  const className = [restProps['class'], 'auto-class-icon'].join(' ');
  delete restProps['class'];

  const host = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (host.current) {
      setIcon(host.current, icon);
    }
  }, [icon, tooltip]);

  const spanProps = tooltip ? { 'aria-label': tooltip } : {};

  return html`<span ref=${host} class=${className} ...${restProps} ...${spanProps}></span>`;
};
