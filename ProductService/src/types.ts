export type Product = {
  count: number;
  id: string;
  title: string;
  description: string;
  price: number;
};

export type DBProduct = Omit<Product, 'count'>;

export type DBStock = {
  productId: string;
  count: number;
};

export type ProductUserInput = {
  count: number;
  title: string;
  description: string;
  price: number;
};

export const isProduct = (data: Record<string, any>): data is Product => {
  return (
    data.id &&
    data.title &&
    data.description &&
    data.price !== undefined &&
    data.count !== undefined
  );
};

export const isProductUserInput = (
  data: Record<string, any>
): data is ProductUserInput => {
  return (
    data.title &&
    data.description &&
    data.price !== undefined &&
    data.count !== undefined
  );
};
