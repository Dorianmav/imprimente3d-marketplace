import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UploadService } from './upload.service';

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'model/stl',
  'model/3mf',
  'application/octet-stream', // fallback navigateurs pour .stl/.3mf
];
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'stl', '3mf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier fourni.');

    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    const mimeOk = ALLOWED_MIME.includes(file.mimetype);
    const extOk = ALLOWED_EXT.includes(ext);

    if (!mimeOk || !extOk) {
      throw new BadRequestException('Type de fichier non autorisé.');
    }

    const url = await this.uploadService.uploadFile(file);
    return { url };
  }
}
