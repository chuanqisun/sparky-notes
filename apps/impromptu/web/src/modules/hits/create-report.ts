import type { H20Proxy } from "../h20/proxy";

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

export async function createReport(proxy: H20Proxy, { report }: CreateReportConfig): Promise<CreateReportResponse> {
  const response = await proxy<any, CreateReportResponse>("/hits/document/create", {
    Title: report.title,
    Contents: report.markdown,
    DocumentType: 0 /** study */,
    FormatType: "Markdown",
    IngestSource: 1 /** web */,
  });
  return response;
}
