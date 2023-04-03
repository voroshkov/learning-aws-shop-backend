import { products } from './data/products.js';

export type Product = (typeof products)[number];
