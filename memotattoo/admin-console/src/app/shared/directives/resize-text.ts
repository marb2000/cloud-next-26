import { Directive, ElementRef, Renderer2, AfterViewInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appResizeText]',
  standalone: true
})
export class ResizeText implements AfterViewInit, OnDestroy {
  private resizeObserver: ResizeObserver;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.resizeObserver = new ResizeObserver(() => {
      this.adjustTextSize();
    });
  }

  ngAfterViewInit() {
    this.resizeObserver.observe(this.el.nativeElement);
    setTimeout(() => this.adjustTextSize(), 50); // initial adjustment
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private adjustTextSize() {
    const element = this.el.nativeElement;
    
    // Reset to initial large size to recalculate from top
    this.renderer.setStyle(element, 'font-size', '100%');
    
    let fontSize = 100; // start at 100% of container or base
    const minFontSize = 20; // don't go smaller than 20%
    
    // While the content overflows its container vertically or horizontally
    while (
      (element.scrollHeight > element.clientHeight || 
       element.scrollWidth > element.clientWidth) && 
      fontSize > minFontSize
    ) {
      fontSize -= 2; // scale down by 2% at a time
      this.renderer.setStyle(element, 'font-size', `${fontSize}%`);
    }
  }
}
