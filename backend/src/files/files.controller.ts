import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Res,
  UploadedFile, UseGuards, UseInterceptors, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  IsInt, IsOptional, IsString, Min,
} from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FilesService } from './files.service';

class InitUploadDto {
  @IsString() fileName: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsString() folderId?: string;
  @IsInt() @Min(0) totalSize: number;
  @IsInt() @Min(1) totalChunks: number;
}
class RenameDto { @IsString() name: string; }
class MoveDto { @IsOptional() @IsString() folderId?: string | null; }

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser('id') uid: string,
    @UploadedFile() file: any,
    @Body('folderId') folderId?: string,
  ) {
    return this.files.uploadSimple(uid, file, folderId);
  }

  @Get()
  list(@CurrentUser('id') uid: string, @Query('folderId') folderId?: string) {
    return this.files.list(uid, folderId);
  }

  @Get(':id')
  meta(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.files.getMeta(uid, id);
  }

  @Get(':id/download-url')
  downloadUrl(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.files.getDownloadUrl(uid, id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { stream, file } = await this.files.getStream(uid, id);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    stream.pipe(res);
  }

  @Patch(':id/rename')
  rename(@CurrentUser('id') uid: string, @Param('id') id: string, @Body() dto: RenameDto) {
    return this.files.rename(uid, id, dto.name);
  }

  @Patch(':id/move')
  move(@CurrentUser('id') uid: string, @Param('id') id: string, @Body() dto: MoveDto) {
    return this.files.move(uid, id, dto.folderId ?? null);
  }

  @Delete(':id')
  remove(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.files.remove(uid, id);
  }

  // ---------- Chunked resumable uploads ----------

  @Post('upload/init')
  initUpload(@CurrentUser('id') uid: string, @Body() dto: InitUploadDto) {
    return this.files.initUpload(uid, dto);
  }

  @Get('upload/:id/status')
  uploadStatus(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.files.getSession(uid, id);
  }

  @Post('upload/:id/chunk/:index')
  @UseInterceptors(FileInterceptor('chunk'))
  uploadChunk(
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
    @UploadedFile() chunk: any,
  ) {
    return this.files.uploadChunk(uid, id, index, chunk.buffer);
  }

  @Post('upload/:id/complete')
  completeUpload(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.files.completeUpload(uid, id);
  }

  @Delete('upload/:id')
  abortUpload(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.files.abortUpload(uid, id);
  }
}
