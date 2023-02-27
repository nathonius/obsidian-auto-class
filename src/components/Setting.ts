import { FunctionComponent, RenderableProps, VNode } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { html } from '../util';
import { Setting } from 'obsidian';

export enum SettingType {
  Button,
  Dropdown,
  ExtraButton,
  Slider,
  Text,
  TextArea,
  Toggle
}

enum ButtonType {
  Default,
  Cta,
  Warning
}

// TODO: Strictly type this
interface SettingControlProps {
  type: SettingType;
  disabled?: boolean;
  value?: any;
  onChange?: (value: any) => any;
  onClick?: (event: MouseEvent) => any;
  tooltip?: string;
  buttonType?: ButtonType;
  icon?: string;
  options?: Record<string, string>;
  limits?: { min: number; max: number; step: number };
  placeholder?: string;
}

export const SettingComponent: FunctionComponent<{
  name?: string | DocumentFragment;
  desc?: string | DocumentFragment;
  className?: string;
}> = (props) => {
  const setting = useRef<Setting>(null);
  useEffect(() => {
    if (!host.current) {
      return;
    }

    // Get children
    let children: VNode<SettingControlProps>[] = [];
    if (props.children) {
      children = Array.isArray(props.children) ? [...props.children] : [props.children];
    }

    // Create setting
    if (!setting.current) {
      setting.current = new Setting(host.current);
    }

    // Clear setting
    // TODO: Figure out how to detect changes rather than
    // clearing the setting every time
    setting.current.clear();

    if (props.name) {
      setting.current.setName(props.name);
    }
    if (props.desc) {
      setting.current.setDesc(props.desc);
    }

    // Add children
    children.forEach((c) => {
      switch (c.props.type) {
        case SettingType.Button:
          addButton(setting.current, c.props);
          break;
        case SettingType.Toggle:
          addToggle(setting.current, c.props);
          break;
        default:
          // TODO: Implement rest of setting types
          break;
      }
    });
  }, [props.name, props.desc, props.children]);
  const host = useRef<HTMLDivElement>(null);
  return html`<div ref=${host} className=${props.className} />`;
};

export const SettingControl: FunctionComponent<SettingControlProps> = () => {
  return null;
};

function addButton(setting: Setting, props: RenderableProps<SettingControlProps>): void {
  setting.addButton((button) => {
    if (props.children && typeof props.children === 'string') {
      button.setButtonText(props.children);
    }
    if (props.onClick) {
      button.onClick(props.onClick);
    }
    if (props.icon) {
      button.setIcon(props.icon);
    }
    if (props.tooltip) {
      button.setTooltip(props.tooltip);
    }
    if (props.disabled === true) {
      button.setDisabled(true);
    }
  });
}

function addToggle(setting: Setting, props: RenderableProps<SettingControlProps>): void {
  setting.addToggle((toggle) => {
    if (props.disabled === true) {
      toggle.setDisabled(true);
    }
    if (props.value) {
      toggle.setValue(props.value);
    }
    if (props.onChange) {
      toggle.onChange(props.onChange);
    }
    if (props.tooltip) {
      toggle.setTooltip(props.tooltip);
    }
  });
}
