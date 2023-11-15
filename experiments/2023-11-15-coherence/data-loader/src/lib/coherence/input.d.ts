type Root = IRoot;

interface IRoot {
  documentName: string;
  article: IRootArticle;
}

interface IRootArticle {
  id: string;
  name: string;
  pivots: IRootArticlePivotsItem[];
}

interface IRootArticlePivotsItem {
  id: string;
  title: string;
  sections: IRootArticlePivotsItemSectionsItem[];
}

interface IRootArticlePivotsItemSectionsItem {
  id: string;
  title: string;
  frames: IRootArticlePivotsItemSectionsItemFramesItem[];
}

interface IRootArticlePivotsItemSectionsItemFramesItem {
  id: string;
  header: IRootArticlePivotsItemSectionsItemFramesItemHeader;
  imageDefinition: IRootArticlePivotsItemSectionsItemFramesItemImageDefinitionItem[];
}

interface IRootArticlePivotsItemSectionsItemFramesItemHeader {
  id: string;
  text: string;
  body: string;
}

interface IRootArticlePivotsItemSectionsItemFramesItemHeaderBodyStylesBaseStyleHyperlink {
  type: string;
  url: string;
}

interface IRootArticlePivotsItemSectionsItemFramesItemImageDefinitionItem {
  id: string;
  altText: string;
  imageSrc: string;
}
