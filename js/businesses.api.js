// js/businesses.api.js - Clean business API wrapper using backend API
import { upsertBusiness, getMyBusiness as apiGetMyBusiness } from './api.js';

console.log('[businesses.api] Module loaded');

export async function createBusiness(payload) {
  console.log('[businesses.api] creating business with payload:', payload);
  
  const business = await upsertBusiness(payload);
  
  console.log('[businesses.api] Business created:', business);
  return business;
}

export async function getMyBusiness(userId) {
  // userId parameter kept for compatibility but not used (API uses auth cookie)
  const business = await apiGetMyBusiness();
  return business;
}
