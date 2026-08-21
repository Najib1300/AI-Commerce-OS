import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs:ClassValue[]){ return twMerge(clsx(inputs)); }
export function slugify(value:string){ return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
export function formatCurrency(value:number,currency="USD"){ return new Intl.NumberFormat("en",{style:"currency",currency,maximumFractionDigits:0}).format(value); }
