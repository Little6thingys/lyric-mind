/*declare module "verovio" {
  export default class VerovioToolkit {
    constructor();
    setOptions(options: Record<string, any>): void;
    loadData(xml: string, options?: Record<string, any>): void;
    renderToSVG(page: number, options?: Record<string, any>): string;
  }
}*/


declare module "verovio" {
  export class toolkit {
    constructor();
    setOptions(options: Record<string, any>): void;
    loadData(xml: string, options?: Record<string, any>): void;
    renderToSVG(page: number, options?: Record<string, any>): string;
  }
}



