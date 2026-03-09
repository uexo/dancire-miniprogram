// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: keyof any | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // 如果指定了特定字段，返回该字段
    if (data) {
      return user[data];
    }

    // 否则返回整个用户对象，并进行字段映射以匹配前端期望
    return {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      grade: user.grade,
      textbookVersion: user.textbook_version,
      isVip: user.is_vip,
      vipExpireAt: user.vip_expire_at,
      status: user.status
    };
  }
);
