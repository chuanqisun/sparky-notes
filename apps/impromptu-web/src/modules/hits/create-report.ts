import { HitsApiProxy } from "./proxy";

export interface CreateReportConfig {
  report: {
    title: string;
    markdown: string;
  };
}

export async function createReport(proxy: HitsApiProxy, { report }: CreateReportConfig): Promise<any> {
  const response = await proxy("/classic/study/create", {
    Title: report.title,
    Contents: report.markdown,
    FormatType: "Markdown",
  });
  return response;
}
