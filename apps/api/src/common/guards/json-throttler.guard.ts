// apps/api/src/common/guards/json-throttler.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class JsonThrottlerGuard extends ThrottlerGuard {
  /**
   * v6'da rate-limit hesaplarını ThrottlerGuard yapıyor.
   * Biz sadece 429 hatasını JSON gövdesiyle fırlatıyoruz.
   * Rest parametre kullanarak imza uyuşmazlığını önlüyoruz.
   */
  protected throwThrottlingException(..._args: any[]): never {
    throw new ThrottlerException({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    } as any);
  }
}
