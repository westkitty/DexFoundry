declare module "pa11y" {
  export interface Pa11yIssue {
    code: string;
    context?: string;
    message: string;
    selector?: string;
    type?: string;
    typeCode?: number;
    runner?: string;
    impact?: string | null;
  }

  export interface Pa11yResult {
    documentTitle?: string;
    pageUrl: string;
    issues: Pa11yIssue[];
  }

  export interface Pa11yOptions {
    runners?: string[];
    standard?: "WCAG2A" | "WCAG2AA" | "WCAG2AAA";
    includeWarnings?: boolean;
    includeNotices?: boolean;
    timeout?: number;
  }

  export default function pa11y(url: string, options?: Pa11yOptions): Promise<Pa11yResult>;
}
