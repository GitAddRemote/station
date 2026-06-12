import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { ContractsService } from './contracts.service';
import { AddContractPartyDto } from './dto/add-contract-party.dto';
import { ContractQueryDto } from './dto/contract-query.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @ApiOperation({ summary: 'List contracts (paginated)' })
  @ApiResponse({ status: 200 })
  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: ContractQueryDto,
  ) {
    return this.contractsService.findAll(req.user.userId, query);
  }

  @ApiOperation({ summary: 'Get a contract by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.findOne(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Create a contract (starts in draft status)' })
  @ApiResponse({ status: 201 })
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateContractDto,
  ) {
    return this.contractsService.create(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Update editable fields (draft or open only)' })
  @ApiResponse({ status: 200 })
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateContractDto,
  ) {
    return this.contractsService.update(req.user.userId, id, dto);
  }

  @ApiOperation({
    summary: 'Soft-delete a contract (sets status to cancelled)',
  })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.remove(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Publish a contract (draft → open)' })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @Post(':id/publish')
  publish(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.publish(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Claim a contract (open → claimed)' })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @Post(':id/claim')
  claim(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.claim(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Start a contract (claimed → active)' })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @Post(':id/start')
  start(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.start(req.user.userId, id);
  }

  @ApiOperation({
    summary:
      'Complete a contract (active → completed); triggers inventory transfer for transfer type',
  })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @Post(':id/complete')
  complete(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.complete(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Dispute a contract (active|completed → disputed)' })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @Post(':id/dispute')
  dispute(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.dispute(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Cancel a contract (any non-terminal → cancelled)' })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.cancel(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Update a milestone state' })
  @ApiResponse({ status: 200 })
  @Patch(':id/milestones/:mid')
  updateMilestone(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mid', ParseUUIDPipe) mid: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateMilestoneDto,
  ) {
    return this.contractsService.updateMilestone(req.user.userId, id, mid, dto);
  }

  @ApiOperation({ summary: 'Add a party to a contract' })
  @ApiResponse({ status: 201 })
  @Post(':id/parties')
  addParty(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: AddContractPartyDto,
  ) {
    return this.contractsService.addParty(req.user.userId, id, dto);
  }

  @ApiOperation({ summary: 'Remove a party from a contract' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/parties/:partyId')
  removeParty(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partyId', ParseUUIDPipe) partyId: string,
  ) {
    return this.contractsService.removeParty(req.user.userId, id, partyId);
  }
}
