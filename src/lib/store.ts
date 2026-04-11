import { useState, useEffect } from 'react';

export interface SoldItem {
  code: string;
  itemName: string;
  price: number;
  purchaseTime: string;
  status: 'valid' | 'used';
  type: 'token' | 'ticket';
}

// Simple in-memory store backed by localStorage for persistence across reloads
const STORAGE_KEY = 'woobar_sold_items';

export const SalesStore = {
  getItems: (): SoldItem[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addItem: (item: Omit<SoldItem, 'status' | 'purchaseTime'>) => {
    const items = SalesStore.getItems();
    const newItem: SoldItem = {
      ...item,
      status: 'valid',
      purchaseTime: new Date().toLocaleString('pt-BR'),
    };
    items.push(newItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return newItem;
  },

  validateCode: (code: string): SoldItem | null => {
    const items = SalesStore.getItems();
    return items.find(i => i.code === code) || null;
  },

  markAsUsed: (code: string): boolean => {
    const items = SalesStore.getItems();
    const index = items.findIndex(i => i.code === code);
    
    if (index !== -1 && items[index].status === 'valid') {
      items[index].status = 'used';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    }
    return false;
  },

  // Helper to generate a random 4-digit code
  generateCode: () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
};
