import { FunctionComponent } from 'preact';
import { className, html, isRuleGroup } from '../util';
import { AutoClassRule, AutoClassRuleGroup } from '../interfaces';
import { useEffect, useRef } from 'preact/hooks';
import Sortable from 'sortablejs';

const c = className('auto-class-settings');

interface RuleListProps {
  rules: (AutoClassRule | AutoClassRuleGroup)[];
  moveRule: (from: HTMLElement, to: HTMLElement, oldIndex: number, newIndex: number) => Promise<void>;
}

export const RuleList: FunctionComponent<RuleListProps> = (props) => {
  const { rules, moveRule } = props;
  const root = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const groups = Array.from(root.current.querySelectorAll<HTMLUListElement>(c('rule-group-list')));
    const sortableLists = [root.current, ...groups];
    sortableLists.forEach((l, index) => {
      new Sortable(l, {
        draggable: `.${c('draggable')}`,
        handle: `.${c('rule-list-drag-handle')}`,
        group: {
          name: index === 0 ? 'root' : 'group',
          put: (to, _, dragEl) => {
            const isGroup = dragEl.classList.contains(c('rule-group'));
            const toName = (to.options.group as Sortable.GroupOptions).name;
            return !isGroup || (isGroup && toName === 'root');
          },
          pull: (_, __, dragEl) => {
            const isGroup = dragEl.classList.contains(c('rule-group'));
            return !isGroup;
          }
        },
        animation: 150,
        chosenClass: c('drag-target'),
        dragClass: c('drag-ghost'),
        fallbackOnBody: true,
        invertSwap: true,
        onEnd: (event) => {
          moveRule(event.from, event.to, event.oldIndex, event.newIndex);
        }
      });
    });
  }, [rules, moveRule]);

  return html`
    <ul ref=${root} class=${c('rule-list')} data-index="-1">
      ${rules.map((r) => {
        if (isRuleGroup(r)) {
          return html`<${RuleListGroup} />`;
        } else {
          return html`<${RuleListItem} />`;
        }
      })}
    </ul>
  `;
};

interface RuleListGroupProps {
  group: AutoClassRuleGroup;
  toggleCollapse: (group: AutoClassRuleGroup, groupList: HTMLElement, collapseButton: HTMLSpanElement) => void;
}

const RuleListGroup: FunctionComponent<RuleListGroupProps> = (props) => {
  const { group, toggleCollapse } = props;
  return html`<li class="${c('rule-group')} ${c('draggable')}">
    <div class=${c('rule-group-header')}>
      <Icon
        class=${c('rule-group-collapse-button')}
        icon=${group.collapsed ? 'up-chevron-glyph' : 'down-chevron-glyph'}
      />
    </div>
  </li> `;
};

const RuleListItem: FunctionComponent = (props) => {
  return html``;
};
