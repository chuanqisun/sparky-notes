class FigmaQuery {
  static async createFromJsx(jsx: any) {
    const node = await figma.createNodeFromJSXAsync(jsx);

    return new FigmaQuery([node]);
  }

  constructor(private nodes: any[]) {}

  first() {
    return new FigmaQuery(this.nodes.slice(0, 1));
  }

  appendTo(parent: ChildrenMixin) {
    this.nodes.forEach((node) => parent.appendChild(node));
    return this;
  }

  center() {
    this.nodes.forEach((node) => {
      node.x = figma.viewport.center.x - node.width / 2;
      node.y = figma.viewport.center.y - node.height / 2;
    });

    return this;
  }

  fit() {
    const previousZoom = figma.viewport.zoom;
    figma.viewport.scrollAndZoomIntoView(this.nodes);

    // only allow zoom out
    if (figma.viewport.zoom > previousZoom) {
      figma.viewport.zoom = previousZoom;
    }

    return this;
  }
}

export const $ = FigmaQuery.createFromJsx;
