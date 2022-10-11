import { MessageToMain } from "@h20/types";

async function main() {
  figma.showUI(`<script>window.location.href="${process.env.WEB_URL}"</script>`, {
    height: 800,
    width: 420,
  });

  figma.ui.onmessage = async (msg: MessageToMain) => {
    console.log(msg);

    if (msg.importResult) {
      if (msg.importResult.isSuccess) {
        figma.notify("Import HITS Search success");
      } else {
        figma.notify("Import HITS Search failed", { error: true });
      }
    }

    if (msg.addCard) {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      const textNode = figma.createText();
      textNode.characters = msg.addCard.title;
      if (msg.addCard.url) {
        textNode.hyperlink = {
          type: "URL",
          value: msg.addCard.url,
        };
      }

      const frame = figma.createFrame();
      frame.layoutMode = "VERTICAL";
      frame.appendChild(textNode);

      frame.paddingTop = 8;
      frame.paddingBottom = 8;
      frame.paddingLeft = 16;
      frame.paddingRight = 16;
      frame.cornerRadius = 8;

      frame.counterAxisSizingMode = "AUTO";
      frame.primaryAxisSizingMode = "AUTO";

      const blackPaint: SolidPaint = {
        type: "SOLID",
        color: {
          r: 0,
          g: 0,
          b: 0,
        },
      };
      const whitePaint: SolidPaint = {
        type: "SOLID",
        color: {
          r: 1,
          g: 1,
          b: 1,
        },
      };
      // paint.paints = [solidPaint]:
      frame.backgrounds = [whitePaint];
      frame.strokes = [blackPaint];
      frame.strokeWeight = 2;

      textNode.resize(400, 10);
      textNode.textAutoResize = "HEIGHT";
      textNode.layoutAlign = "STRETCH";
      textNode.fontSize = 20;
      textNode.fills = [blackPaint];
      textNode.locked = true;

      frame.x = figma.viewport.center.x - frame.width / 2 + 32;
      frame.y = figma.viewport.center.y - frame.height / 2 + 32;
      figma.currentPage.appendChild(frame);

      figma.viewport.scrollAndZoomIntoView([frame]);

      figma.notify(`✅ Card added to canvas`);
    }
  };
}

main();
