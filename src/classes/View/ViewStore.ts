import { ViewFunction } from '../../types';
import { IViewInfo } from '../../types/view.types';

class ViewStore {
  protected views: IViewInfo[] = [];

  importViews(Module: any): true {
    const views: ViewFunction[] = Reflect.getMetadata('views', Module) || [];

    views.forEach(async (view: ViewFunction): Promise<void> => {
      const name: string = view.name.replace('View', '').toLowerCase();
      this.views.push({ name, view });
    });

    return true;
  }

  getView(viewId: string): IViewInfo | undefined {
    return this.views.find((view: IViewInfo): boolean => view.name == viewId);
  }
}

export const viewStore: ViewStore = new ViewStore();
