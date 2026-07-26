import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantIsolationGuard } from '../auth/guards/tenant-isolation.guard';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import type { JwtUser } from '../auth/guards/tenant-isolation.guard';

@Controller('employee')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('today-menu')
  getTodayMenu(@Req() req: { user: JwtUser }) {
    return this.employeeService.getTodayMenu(req.user.providerId) as Promise<Record<string, unknown> | null>;
  }

  @Get('delivery-zones')
  getDeliveryZones(@Req() req: { user: JwtUser }) {
    return this.employeeService.getDeliveryZones(req.user.providerId);
  }

  @Post('orders')
  placeOrder(@Req() req: { user: JwtUser }, @Body() dto: CreateOrderDto) {
    return this.employeeService.placeOrder(req.user.userId, req.user.providerId, dto);
  }

  @Get('orders')
  getMyOrders(@Req() req: { user: JwtUser }) {
    return this.employeeService.getMyOrders(req.user.userId, req.user.providerId);
  }
}
