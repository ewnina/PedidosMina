import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Req() req: { user: { userId: string; providerId: string } },
    @Body() body: CreateOrderDto & { employeeName: string; employeePhone: string; providerName: string },
  ) {
    return this.ordersService.createOrder(
      body,
      req.user.userId,
      req.user.providerId,
      '',
      body.employeeName,
      body.employeePhone,
      body.providerName,
    );
  }

  @Get()
  findAll(@Req() req: { user: { providerId: string } }, @Query('dailyMenuId') dailyMenuId?: string) {
    return this.ordersService.findAll(req.user.providerId, dailyMenuId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }
}
