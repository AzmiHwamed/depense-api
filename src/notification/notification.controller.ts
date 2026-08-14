import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { Translate } from 'src/translation/translate.decorator';
import { CheckCountryDto } from './dto/check-country.dto';

// Fields that should never go through the translation model.
const NOTIFICATION_IGNORE_KEYS = [
  'id',
  'userId',
  'data',
  'source',
  'read',
  'pushSent',
  'createdAt',
];

@ApiTags('Notifications')
@UseGuards(FirebaseAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a notification for the authenticated user (and optionally push it immediately)' })
  @ApiResponse({ status: 201, description: 'Notification created', type: Notification })
  create(@CurrentUser() user: User, @Body() dto: CreateNotificationDto) {
    return this.service.create({ ...dto, userId: user.id });
  }

  @Post('check-country')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compare the detected country with the user declared country' })
  @ApiResponse({ status: 201, description: 'Country checked; notification created when different' })
  checkCountry(@CurrentUser() user: User, @Body() dto: CheckCountryDto) {
    return this.service.checkCurrentCountry(user, dto.detectedCountryCode);
  }

  @Get('me')
  @ApiBearerAuth()
  @Translate({ ignoreKeys: NOTIFICATION_IGNORE_KEYS })
  @ApiOperation({ summary: "List the authenticated user's notifications" })
  @ApiResponse({
    status: 200,
    description: "List of the current user's notifications",
    type: [Notification],
  })
  findMine(@CurrentUser() user: User) {
    return this.service.findAll(user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Translate({ ignoreKeys: NOTIFICATION_IGNORE_KEYS })
  @ApiOperation({ summary: 'Get a single notification belonging to the authenticated user' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification found', type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a notification belonging to the authenticated user' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification updated', type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read', type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.markAsRead(user.id, id);
  }

  @Patch('me/read-all')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark all of the authenticated user's notifications as read" })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllMineRead(@CurrentUser() user: User) {
    return this.service.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a notification belonging to the authenticated user' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }

  @Post('devices')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register (or refresh) a device token for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Device token registered', type: DeviceToken })
  registerDevice(@CurrentUser() user: User, @Body() dto: RegisterDeviceTokenDto) {
    return this.service.registerDeviceToken({ ...dto, userId: user.id });
  }

  @Delete('devices/:token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unregister a device token (e.g. on logout)' })
  @ApiParam({ name: 'token', description: 'FCM device token' })
  @ApiResponse({ status: 200, description: 'Device token removed' })
  removeDevice(@CurrentUser() user: User, @Param('token') token: string) {
    return this.service.removeDeviceToken(user.id, token);
  }
}
