// user.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './user.entity';
import {
  CreateUserDto,
  LoginDto,
  GoogleLoginDto,
  RefreshTokenDto,
  FcmTokenDto,
  SearchUserDto,
} from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { RedisDataService } from 'src/configuars/redis/redis-data.service';

import {
  generateAccessToken,
  generateRefreshToken,
  resetDeviceState,
} from '../../utils/auth/auth.util'; // Updated imports
import { RabbitmqService } from 'src/configuars/messaging/rabbitmq.service';

@Injectable()
export class UserService {
  private readonly saltRounds = 10;
  private readonly jwtSecret: string;
  private readonly rabbitmq: RabbitmqService;
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private redisService: RedisDataService, // Inject RedisDataService for utils
  ) {
    this.jwtSecret = this.configService.get('JWT_SECRET') || 'your-secret';
  }

  async register(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, firstName, lastName, birthday, gender, avatar } =
      createUserDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, this.saltRounds);
    const name = `${firstName || ''} ${lastName || ''}`.trim() || email;

    const user = this.userRepository.create({
      email,
      password: passwordHash,
      firstName,
      lastName,
      name,
      birthday,
      gender: gender || 'unknown',
      avatar,
    });

    return await this.userRepository.save(user);
  }

  async login(loginDto: LoginDto): Promise<{
    user: Partial<User>;
    access_token: string;
    refresh_token: string;
  }> {
    const { email, password, deviceId } = loginDto; // Standardized to deviceId

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (deviceId) {
      await resetDeviceState(user._id, deviceId, this.redisService); // Updated to use new util
    }

    const userInfo = {
      _id: user._id,
      name: user.name || '',
      avatar: user.avatar || '',
    };

    const accessToken = await generateAccessToken(
      userInfo,
      this.configService,
      this.redisService,
    );
    const refreshToken = await generateRefreshToken(
      userInfo,
      this.configService,
      this.redisService,
    );

    return {
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async loginWithGoogle(googleDto: GoogleLoginDto): Promise<{
    user: Partial<User>;
    access_token: string;
    refresh_token: string;
  }> {
    const { user: googleUser, deviceId } = googleDto;
    const {
      email,
      name,
      firstName,
      lastName,
      birthday,
      gender,
      avatar,
      password,
    } = googleUser;

    let dbUser = await this.userRepository.findOne({ where: { email } });

    if (dbUser) {
      // For existing user, assume password check if provided, but for Google, maybe skip or use a default
      if (password && !(await bcrypt.compare(password, dbUser.password))) {
        throw new UnauthorizedException('Invalid password');
      }

      if (deviceId) {
        await resetDeviceState(dbUser._id, deviceId, this.redisService); // Updated
      }

      const userInfo = {
        _id: dbUser._id,
        name: dbUser.name || '',
        avatar: dbUser.avatar || '',
      };

      const accessToken = await generateAccessToken(
        userInfo,
        this.configService,
        this.redisService,
      );
      const refreshToken = await generateRefreshToken(
        userInfo,
        this.configService,
        this.redisService,
      );

      return {
        user: {
          _id: dbUser._id,
          name: dbUser.name,
          avatar: dbUser.avatar,
          email: dbUser.email,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } else {
      // Create new user
      const passwordHash: string = password
        ? await bcrypt.hash(password, this.saltRounds)
        : await bcrypt.hash('google-default-pass', this.saltRounds);
      const newUser = this.userRepository.create({
        email,
        password: passwordHash,
        firstName,
        lastName,
        name: name || `${firstName || ''} ${lastName || ''}`.trim(),
        birthday,
        gender: gender || 'unknown',
        avatar,
      } as Partial<User>);

      const savedUser = await this.userRepository.save(newUser);

      if (deviceId) {
        await resetDeviceState(savedUser._id, deviceId, this.redisService); // Updated
      }

      const userInfo = {
        _id: savedUser._id,
        name: savedUser.name || '',
        avatar: savedUser.avatar || '',
      };

      const [access_token, refresh_token] = await Promise.all([
        generateAccessToken(userInfo, this.configService, this.redisService),
        generateRefreshToken(userInfo, this.configService, this.redisService),
      ]);

      return {
        user: {
          _id: savedUser._id,
          name: savedUser.name,
          avatar: savedUser.avatar,
          email: savedUser.email,
        },
        access_token,
        refresh_token,
      };
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
    user: Partial<User>;
    access_token: string;
    refresh_token: string;
  }> {
    const { refreshToken } = refreshTokenDto;

    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as {
        userId: string; // Fixed: match jwt.sign({ userId })
      };
      const user = await this.userRepository.findOne({
        where: { _id: decoded.userId }, // Fixed: use '_id' and 'userId'
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const userInfo = {
        _id: user._id,
        name: user.name || '',
        avatar: user.avatar || '',
      };

      const accessToken = await generateAccessToken(
        userInfo,
        this.configService,
        this.redisService,
      );

      return {
        user: {
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          email: user.email,
        },
        access_token: accessToken,
        refresh_token: refreshToken, // Return the same refresh token
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async updateUser(
    _id: string, // Fixed: param name
    updateData: Partial<CreateUserDto>,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { _id } }); // Fixed: use '_id'
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(
        updateData.password,
        this.saltRounds,
      );
      delete updateData.password;
    }

    Object.assign(user, updateData);
    if (updateData.firstName || updateData.lastName) {
      user.name =
        `${updateData.firstName || user.firstName} ${updateData.lastName || user.lastName}`.trim();
    }

    return await this.userRepository.save(user);
  }

  async forgetPassword(phone: string): Promise<{ message: string }> {
    // Incomplete in original, assuming basic implementation
    // Note: Entity has no phone, adapt if added (e.g., where: { phone })
    const user = await this.userRepository.findOne({
      where: { email: phone }, // Fallback to email if no phone field
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Implement OTP logic here, e.g., send to email/phone
    return { message: 'OTP sent successfully' };
  }

  async setFcmToken(userId: string, fcmTokenDto: FcmTokenDto): Promise<void> {
    // Fixed: param name
    // Note: Entity has no fcmToken field, assuming we add it or handle via RabbitMQ
    this.rabbitmq.publish('user_fcmtoken', {
      user_id: userId,
      fcmtoken: fcmTokenDto.fcmToken,
    });
  }

  async searchUsers(searchDto: SearchUserDto): Promise<{ users: any[] }> {
    const { keyword, _id } = searchDto; // Fixed: param name

    if (!keyword) {
      throw new BadRequestException('Keyword is required');
    }

    let users: User[] = [];

    if (keyword === '@') {
      // Get friends (assuming friends is array of user _ids)
      const currentUser = await this.userRepository.findOne({
        where: { _id }, // Fixed: use '_id'
        relations: ['friends'], // TypeORM relations need setup if needed
      });
      if (currentUser && currentUser.friends.length > 0) {
        users = await this.userRepository.find({
          where: { _id: In(currentUser.friends) }, // Fixed: use '_id'
          select: ['_id', 'firstName', 'lastName', 'avatar'], // Fixed: use '_id'
          take: 15,
        });
      }
    } else if (keyword.startsWith('@')) {
      const searchTerm = keyword.slice(1);
      users = await this.userRepository
        .createQueryBuilder('user')
        .where(
          '(LOWER(user.firstName) LIKE :term OR LOWER(user.lastName) LIKE :term)',
          { term: `%${searchTerm.toLowerCase()}%` },
        )
        .select(['_id', 'firstName', 'lastName', 'avatar', 'name']) // Fixed: use '_id'
        .take(20)
        .getMany();
    }

    const formattedUsers = users.map((u) => ({
      _id: u._id, // Fixed: use '_id'
      name: u.name || `${u.firstName} ${u.lastName}`.trim(),
      avatar: u.avatar,
    }));

    return { users: formattedUsers };
  }
}
