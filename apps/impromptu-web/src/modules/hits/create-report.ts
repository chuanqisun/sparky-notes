import { HitsApiProxy } from "./proxy";

export interface CreateReportConfig {
  report: {
    title: string;
    markdown: string;
  };
}

export interface CreateReportResponse {
  id: number;
  familyId: number;
  url: string;
}

export async function createReport(proxy: HitsApiProxy, { report }: CreateReportConfig): Promise<CreateReportResponse> {
  const response = await proxy<any, CreateReportResponse>("/classic/study/create", {
    Title: report.title,
    Contents: report.markdown,
    FormatType: "Markdown",
  });
  return response;
}
