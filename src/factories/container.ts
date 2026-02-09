import { Container } from 'inversify';
import { getServiceFactory } from './ServiceFactory.js';

/**
 * Get the global IoC container instance
 */
export const container = {
  get<T>(identifier: string | symbol): T {
    const serviceFactory = getServiceFactory();
    return serviceFactory.getService<T>(identifier);
  }
};