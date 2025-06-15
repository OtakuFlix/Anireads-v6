declare module 'page-flip' {
  type PageFlipEvent = 'flip' | 'changeOrientation' | 'init' | 'update' | 'flipBack' | 'flipForward' | 'changeState' | 'changeViewMode';
  
  type OrientationType = 'landscape' | 'portrait';
  type SizeType = 'fixed' | 'stretch' | 'stretch-mini' | 'stretch-max' | 'stretch-proportional';
  
  interface PageFlipSettings {
    // Basic dimensions
    width?: number;
    height?: number;
    size?: SizeType;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    
    // Appearance
    maxShadowOpacity?: number;
    showCover?: boolean;
    drawShadow?: boolean;
    flippingTime?: number;
    
    // Behavior
    autoSize?: boolean;
    mobileScrollSupport?: boolean;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    usePortrait?: boolean;
    disableFlipByClick?: boolean;
    
    // Navigation
    startPage?: number;
    orientation?: OrientationType;
    
    // Other common properties
    showPageCorners?: boolean;
    swipeDistance?: number;
    swipeDistanceThreshold?: number;
    // Add other settings as needed
  }

  interface FlipEventData {
    data: number;
    // Add other event data properties as needed
  }

  export class PageFlip {
    constructor(container: HTMLElement, settings?: PageFlipSettings);
    
    // Core methods
    loadFromHTML(elements: HTMLElement[]): void;
    updateFromHtml(elements?: HTMLElement[]): void;
    update(): void;
    destroy(): void;
    
    // Navigation
    flipNext(): void;
    flipPrev(): void;
    flip(globalPagePosition: number): void;
    
    // Event handling
    on(event: PageFlipEvent, callback: (e: FlipEventData) => void): void;
    off(event: PageFlipEvent, callback: (e: FlipEventData) => void): void;
    
    // UI updates
    updatePageFlipSize(): void;
    updatePageRefs(elements: HTMLElement[]): void;
    
    // State
    getCurrentPageIndex(): number;
    getPageCount(): number;
    
    // Add other methods as needed
  }
}
