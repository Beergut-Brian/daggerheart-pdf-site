declare module '@pdftron/pdfjs-express-viewer' {
  interface WebViewerOptions {
    path: string;
    licenseKey?: string;
    initialDoc?: string;
    disabledElements?: string[];
    enableAnnotations?: boolean;
    enableRedactions?: boolean;
    enableMeasurement?: boolean;
    enableFilePicker?: boolean;
    enablePrint?: boolean;
    enableDownload?: boolean;
    enableFullAPI?: boolean;
    headerView?: string;
    sidebarView?: string;
    streaming?: boolean;
    streamingBufferSize?: number;
  }

  interface WebViewerInstance {
    UI: {
      disableFeatures: (features: any[]) => void;
      disableElements: (elements: string[]) => void;
      dispose: () => void;
      Feature: {
        Annotations: string;
        Redaction: string;
        Measurement: string;
      };
    };
    Core: {
      documentViewer: any;
    };
  }

  function WebViewer(
    options: WebViewerOptions,
    viewerElement: HTMLElement
  ): Promise<WebViewerInstance>;

  export default WebViewer;
}

