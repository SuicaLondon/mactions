import { components as defaults, type NoticeProps } from 'react-select';

import { type ReactSelectProps, type SelectOption } from '../types';

/** A menu footer (such as a load error) already explains an empty list, so the hint is omitted. */
export function SelectNoOptionsMessage(props: NoticeProps<SelectOption, false>) {
  if ((props.selectProps as ReactSelectProps).menuFooter) return null;
  return <defaults.NoOptionsMessage {...props} />;
}
