/*declare module "verovio" {
  const Verovio: any;
  export default Verovio;
}


// Verovio v5.6.0 TypeScript declaration
declare module "verovio" {
  export class toolkit {
    constructor();
    setOptions(options: Record<string, any>): void;
    loadData(xml: string, options?: Record<string, any>): void;
    renderToSVG(page: number, options?: Record<string, any>): string;
  }
}*/

// Verovio v5.6.0 minimal TypeScript declaration
declare module "verovio" {
  export class toolkit {
    constructor();
    setOptions(options: Record<string, any>): void;
    loadData(xml: string, options?: Record<string, any>): void;
    renderToSVG(page: number, options?: Record<string, any>): string;
  }

  const verovio: {
    toolkit: typeof toolkit;
  };
  export default verovio;
}

