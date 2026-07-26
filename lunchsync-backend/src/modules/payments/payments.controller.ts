import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantIsolationGuard, type JwtUser } from '../auth/guards/tenant-isolation.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { ValidationPipe } from '@nestjs/common';

const PROOFS_DIR = join(process.cwd(), 'uploads', 'proofs');

@Controller('payments')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('proofImage', {
    storage: diskStorage({
      destination: PROOFS_DIR,
      filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        cb(new BadRequestException('Solo se permiten imágenes (jpg, png, webp)'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async create(
    @Req() req: { user: JwtUser },
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreatePaymentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const proofImageUrl = file ? `/uploads/proofs/${file.filename}` : undefined;
    return this.paymentsService.create(req.user.userId, req.user.providerId, dto, proofImageUrl);
  }

  @Patch(':id/confirm')
  async confirm(
    @Req() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentsService.confirm(id, req.user.providerId, dto, req.user.userId);
  }

  @Get('my')
  async findMyPayments(@Req() req: { user: JwtUser }) {
    return this.paymentsService.findByUser(req.user.userId, req.user.providerId);
  }

  @Get('summary')
  async getSummary(
    @Req() req: { user: JwtUser },
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.paymentsService.getSummary(req.user.providerId, dateFrom, dateTo);
  }

  @Get()
  async findAll(
    @Req() req: { user: JwtUser },
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('employeeName') employeeName?: string,
  ) {
    return this.paymentsService.findByProvider(req.user.providerId, { status, dateFrom, dateTo, employeeName });
  }
}
