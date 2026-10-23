'use client';

import { useEffect, useRef } from 'react';

export default function Home() {
  const viewer = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!viewer.current) return;

    const viewerElement = viewer.current;
    // PDF.js Express keys are public, domain-locked client keys; the env value wins when set.
    const licenseKey = process.env.NEXT_PUBLIC_PDFJS_EXPRESS_KEY || 'DldYx9TsXF9ee83fwl9p';
    // The PDFs live in Cloudflare R2 (too large for git); NEXT_PUBLIC_PDF_BASE is that public bucket address.
    const pdfBase = (process.env.NEXT_PUBLIC_PDF_BASE || `${window.location.origin}/pdfs`).replace(/\/$/, '');
    const pdfUrl = `${pdfBase}/Daggerheart-optimized.pdf`;

    // Dynamically import WebViewer (required for Next.js client-side rendering)
    import('@pdftron/pdfjs-express-viewer').then((WebViewerModule) => {
      const WebViewer = WebViewerModule.default;
      console.log('Using @pdftron/pdfjs-express-viewer package');

      // Initialize WebViewer following React integration pattern from docs
      WebViewer(
        {
          path: '/webviewer',
          licenseKey: licenseKey,
          initialDoc: pdfUrl,
          // Disable annotation and redaction features
          disabledElements: [
            'annotations',
            'annotationEdit',
            'annotationComment',
            'annotationPopup',
            'annotationStylePopup',
            'annotationColorPicker',
            'annotationShape',
            'annotationFreeText',
            'annotationText',
            'annotationStamp',
            'annotationEraser',
            'annotationLine',
            'annotationArrow',
            'annotationPolyline',
            'annotationPolygon',
            'annotationRectangle',
            'annotationEllipse',
            'annotationCloud',
            'annotationCallout',
            'annotationSignature',
            'annotationFileAttachment',
            'annotationSound',
            'annotationRedaction',
            'annotationRedactionTool',
            'redactionTool',
            'redactionToolButton',
            'redactionToolGroupButton',
          ],
        },
        viewerElement
      ).then((instance: any) => {
        instanceRef.current = instance;

        // Additional configuration to disable annotations/redactions
        const { UI } = instance;

        // Disable annotation tools
        if (UI.disableFeatures) {
          UI.disableFeatures([
            UI.Feature?.Annotations,
            UI.Feature?.Redaction,
            UI.Feature?.Measurement,
          ].filter(Boolean));
        }

        // Hide annotation-related UI elements
        if (UI.disableElements) {
          UI.disableElements([
            'annotations',
            'annotationEdit',
            'annotationComment',
            'annotationPopup',
            'annotationStylePopup',
            'annotationColorPicker',
            'annotationShape',
            'annotationFreeText',
            'annotationText',
            'annotationStamp',
            'annotationEraser',
            'annotationLine',
            'annotationArrow',
            'annotationPolyline',
            'annotationPolygon',
            'annotationRectangle',
            'annotationEllipse',
            'annotationCloud',
            'annotationCallout',
            'annotationSignature',
            'annotationFileAttachment',
            'annotationSound',
            'annotationRedaction',
            'annotationRedactionTool',
            'redactionTool',
            'redactionToolButton',
            'redactionToolGroupButton',
          ]);
        }
      }).catch((error: any) => {
        console.error('Error initializing WebViewer:', error);
      });
    }).catch((error: any) => {
      console.error('Error loading PDF.js Express Viewer module:', error);
    });

    // Cleanup
    return () => {
      if (instanceRef.current && instanceRef.current.UI) {
        instanceRef.current.UI.dispose();
        instanceRef.current = null;
      }
    };
  }, []);

  return (
    <main style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <div 
        ref={viewer} 
        style={{ 
          height: "100%", 
          width: "100%",
        }} 
      />
    </main>
  );
}
