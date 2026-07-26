import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantIsolationGuard } from '../auth/guards/tenant-isolation.guard';
import type { JwtUser } from '../auth/guards/tenant-isolation.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Req() req: { user: JwtUser },
    @Body() body: CreateOrderDto & { employeeName: string; employeePhone: string; providerName: string; serviceName: string },
  ) {
    return this.ordersService.createOrder(
      body,
      req.user.userId,
      req.user.providerId,
      '',
      body.employeeName,
      body.employeePhone,
      body.providerName,
      body.serviceName,
    );
  }

  @Get()
  findAll(@Req() req: { user: JwtUser }, @Query('dailyMenuId') dailyMenuId?: string) {
    const providerId = req.user.role === 'superuser' ? undefined : req.user.providerId;
    return this.ordersService.findAll(providerId, dailyMenuId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }
}
