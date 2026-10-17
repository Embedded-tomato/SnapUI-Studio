export type PageId = "preview" | "album" | "settings" | "challenge";

export type SlotId =
  | "topbar"
  | "leftbar"
  | "center"
  | "bottombar"
  | "settingsRows"
  | "albumGrid"
  | "challengeRows";

/** 手势导航：在某页面向某方向滑动后切换到哪个页面 */
export type SwipeDir = "left" | "right" | "up" | "down";
export type NavMap = Partial<Record<PageId, Partial<Record<SwipeDir, PageId>>>>;

export interface ComponentPropSchema {
  key: string;
  label: string;
  kind: "text" | "boolean" | "number";
}

export interface ComponentDef {
  type: string;
  name: string;
  icon: string;
  desc: string;
  /** 允许落入的槽位，第一个为默认槽位（自动吸附目标） */
  slots: SlotId[];
  /** 同一槽位是否只允许一个实例 */
  unique?: boolean;
  propsSchema: ComponentPropSchema[];
  defaultProps: Record<string, string | number | boolean>;
}

export interface PlacedComponent {
  id: string;
  type: string;
  slot: SlotId;
  props: Record<string, string | number | boolean>;
}

export interface UiProject {
  screen: { width: number; height: number };
  /** 手势导航表：preview 左滑→settings 等 */
  nav: NavMap;
  pages: Record<PageId, PlacedComponent[]>;
}
