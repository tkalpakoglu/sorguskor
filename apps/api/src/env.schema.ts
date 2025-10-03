// apps/api/src/env.schema.ts
import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().default('devaccess'),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),

  JWT_REFRESH_SECRET: Joi.string().default('devrefresh'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),

  CLIENT_URL: Joi.string().uri().default('http://localhost:3000'),
});
