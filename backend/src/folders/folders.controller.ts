import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FoldersService } from './folders.service';

class CreateFolderDto {
  @IsString() name: string;
  @IsOptional() @IsString() parentId?: string;
}
class RenameDto { @IsString() name: string; }
class MoveDto { @IsOptional() @IsString() parentId?: string | null; }

@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Post()
  create(@CurrentUser('id') uid: string, @Body() dto: CreateFolderDto) {
    return this.folders.create(uid, dto.name, dto.parentId);
  }

  @Get()
  list(@CurrentUser('id') uid: string, @Query('parentId') parentId?: string) {
    return this.folders.list(uid, parentId);
  }

  @Get(':id')
  get(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.folders.get(uid, id);
  }

  @Patch(':id/rename')
  rename(@CurrentUser('id') uid: string, @Param('id') id: string, @Body() dto: RenameDto) {
    return this.folders.rename(uid, id, dto.name);
  }

  @Patch(':id/move')
  move(@CurrentUser('id') uid: string, @Param('id') id: string, @Body() dto: MoveDto) {
    return this.folders.move(uid, id, dto.parentId ?? null);
  }

  @Delete(':id')
  remove(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.folders.remove(uid, id);
  }
}
