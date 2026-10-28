import {
  Body, Controller, Delete, Get, Param, Post, UseGuards,
} from '@nestjs/common';
import { IsEmail, IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SharingService } from './sharing.service';
import { PermissionLevel } from './permission.enum';

class ShareDto {
  @IsEmail() email: string;
  @IsEnum(PermissionLevel) permission: PermissionLevel;
}

@UseGuards(JwtAuthGuard)
@Controller('share')
export class SharingController {
  constructor(private readonly sharing: SharingService) {}

  @Post('file/:id')
  shareFile(@CurrentUser('id') uid: string, @Param('id') id: string, @Body() dto: ShareDto) {
    return this.sharing.shareFile(uid, id, dto.email, dto.permission);
  }

  @Post('folder/:id')
  shareFolder(@CurrentUser('id') uid: string, @Param('id') id: string, @Body() dto: ShareDto) {
    return this.sharing.shareFolder(uid, id, dto.email, dto.permission);
  }

  @Get('file/:id')
  listFileShares(@Param('id') id: string) {
    return this.sharing.listFileShares(id);
  }

  @Get('folder/:id')
  listFolderShares(@Param('id') id: string) {
    return this.sharing.listFolderShares(id);
  }

  @Get('shared-with-me')
  sharedWithMe(@CurrentUser('id') uid: string) {
    return this.sharing.listSharedWithMe(uid);
  }

  @Delete(':shareId')
  revoke(@CurrentUser('id') uid: string, @Param('shareId') shareId: string) {
    return this.sharing.revoke(uid, shareId);
  }
}
