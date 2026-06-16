const path = require("path");
const dotenv = require("dotenv");
const Joi = require("joi");

process.env.DOTENV_KEY = "";
process.env.DOTENV_CONFIG_PATH = "";

dotenv.config({
  path: path.join(process.cwd(), ".env"),
  override: true,
  quiet: true,
});

const env = process.env.NODE_ENV || "development";
const envFile = `.env.${env}`;

dotenv.config({
  path: path.join(process.cwd(), envFile),
  override: true,
  quiet: true,
});

const schema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").required(),
  PORT: Joi.number().positive().default(4000),
  MONGO_URI: Joi.string().uri().required(),
  // JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  // JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  // JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  // JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).default(12),
  SMTP_HOST: Joi.string().allow(""),
  SMTP_PORT: Joi.number().allow(null),
  SMTP_USER: Joi.string().allow(""),
  SMTP_PASS: Joi.string().allow(""),
  REDIS_URL: Joi.string().allow(""),
  CORS_ORIGINS: Joi.string().default("http://localhost:3000"),
  COOKIE_SECURE: Joi.boolean().default(true),
  FRONTEND_URL: Joi.string().default("http://localhost:3000"),
}).unknown();

const { value: validatedEnv, error } = schema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) throw new Error(`Config validation error: ${error.message}`);

module.exports = validatedEnv;
