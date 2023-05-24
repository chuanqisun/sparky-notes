export interface IPageSearchIndexDefinition {
  id: string;
  name: string;
  order?: number;
  group: string | undefined;
  componentProps?: any;
  url: string;
  description?: string;
  component?: string;
  navSubSections?: string;
}
export interface FigmaDocumentDefinition {
  documentName?: string;
  fileId?: string;
  id?: string;
  article: IFigmaArticleDefinition;
  lastModified?: string;
}
export interface IFigmaArticleDefinition {
  id: string;
  name?: string;
  pivots?: IFigmaPivotDefinition[];
}
export interface IFigmaPivotDefinition {
  id?: string;
  title?: string;
  sections?: IFigmaSectionDefinition[];
}
export interface IFigmaSectionDefinition {
  id?: string;
  title?: string;
  frames?: IFigmaFrameDefinition[];
}
export interface IFigmaLines {
  index: number;
  indentation: number;
  type: string;
  isEmpty: boolean;
}
export interface IFigmaFrameDefinition {
  id: string;
  header?: IFigmaFrameHeaderDefinition;
  imageSize?: number;
  imageDimension?: string;
  imageDefinition?: (IFigmaFrameImageDefinition | null)[]; // parser bug
  headerPosition?: "top" | "left";
  hasDividerLine?: boolean;
}
export interface IFigmaFrameHeaderDefinition {
  id: string;
  text?: string;
  body?: string;
  textStyles?: IFigmaFrameTextStylesMap;
  bodyStyles?: IFigmaFrameTextStylesMap;
  lines?: IFigmaLines[];
}
export interface IFigmaFrameImageDefinition {
  id?: string;
  altText?: string;
  stillGifSrc?: string;
  imageSrc?: string;
  state?: string;
  properties?: IPropertyMap;
  supportingText?: string;
  stateStyles?: IFigmaFrameTextStylesMap;
  supportStyles?: IFigmaFrameTextStylesMap;
  screenReaderLabels?: IScreenReaderLabelDefinition[];
  lines?: IFigmaLines[];
}
export interface IFigmaFrameTextStylesMap {
  baseStyle?: IFigmaFrameTextStyles;
  styleOverride?: FigmaStyleOverrideType;
}
export interface IFigmaFrameTextStyles {
  fontFamily?: string;
  fontPostScriptName?: string;
  fontWeight?: number;
  textAutoResize?: string;
  hyperlink?: IFigmaLink;
  textDecoration?: string;
  fontSize?: number;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  lineHeightPercentFontSize?: number;
  lineHeightUnit?: string;
}
export type FigmaStyleOverrideType = IFigmaFrameOverrideSegmentList & IFigmaFrameStyleOverride;
export interface IFigmaFrameStyleOverride {
  [key: string]: IFigmaFrameOverrideStyles;
}
export interface IFigmaFrameOverrideStyles extends IFigmaFrameTextStyles {
  segments?: IFigmaSegment[];
}
export interface IFigmaFrameOverrideSegmentList {
  segmentList?: IFigmaSegment[];
}
export interface IFigmaLink {
  type?: string;
  url?: string;
}
export interface IScreenReaderLabelDefinition {
  id?: string;
  step?: string;
  content?: string;
  stepStyles?: IFigmaFrameTextStylesMap;
  contentStyles?: IFigmaFrameTextStylesMap;
  lines?: IFigmaLines[];
}
export interface IPropertyMap {
  StateBars?: string;
}
export interface IFigmaSegment {
  start?: number;
  end?: number;
  key?: number | string;
}
export interface IFigmaBaseOverrideStyles {
  [key: string]: IFigmaBaseOverrideStyle;
}
export type IFigmaBaseOverrideStyle = IFigmaFrameTextStyles | IFigmaFrameOverrideStyles;
