import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface JwtUser {
  userId: string;
  email: string;
  role: string;
  providerId: string;
}

export const TENANT_SCOPED_KEY = 'tenantScoped';
export const TenantScoped = () => {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(TENANT_SCOPED_KEY, true, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(TENANT_SCOPED_KEY, true, target);
    return target;
  };
};

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isTenantScoped = this.reflector.getAllAndOverride<boolean>(TENANT_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isTenantScoped) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser | undefined;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    if (user.role === 'superuser') {
      return true;
    }

    const paramProviderId = request.params?.providerId as string | undefined;

    if (paramProviderId && paramProviderId !== user.providerId) {
      throw new ForbiddenException('No tienes acceso a este proveedor');
    }

    return true;
  }
}
