import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FacebookService } from './facebook.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('facebook')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacebookController {
  constructor(private svc: FacebookService) {}

  // Pages
  @Get('pages') getPages() { return this.svc.getPages(); }
  @Post('pages') @Roles(Role.ADMIN, Role.MANAGER)
  connectPage(@Body() body: any, @CurrentUser('id') uid: number) { return this.svc.connectPage({ ...body, connected_by: uid }); }
  @Delete('pages/:id') @Roles(Role.ADMIN)
  disconnectPage(@Param('id') id: number) { return this.svc.disconnectPage(id); }

  // Posts
  @Get('posts') getPosts(@Query('page_id') pid?: number, @Query('status') s?: string) { return this.svc.getPosts(pid, s); }
  @Post('posts') createPost(@Body() body: any, @CurrentUser('id') uid: number) { return this.svc.createPost({ ...body, created_by: uid }); }
  @Post('posts/:id/publish') publishPost(@Param('id') id: number) { return this.svc.publishPost(id); }
  @Delete('posts/:id') deletePost(@Param('id') id: number) { return this.svc.deletePost(id); }

  // AI Post Generation
  @Post('generate-post') generatePost(@Body() body: any) {
    return this.svc.generatePost(body);
  }

  // Translation
  @Post('translate')
  translate(@Body() body: { text: string; target_lang?: string }) {
    return this.svc.translateText(body.text, body.target_lang || 'zh');
  }

}