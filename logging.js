const colors = require("colors");
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, prettyPrint, simple, printf, json } = format;

const TelegramLogger = require("winston-telegram");
require("dotenv").config();

// Add different colors for different levels using colorize?
const logger = createLogger({
  level: "info",
  format: combine(timestamp(), json(), prettyPrint()),
  transports: [new transports.File({ filename: "logs.log" })],
});

if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "e2e") {
  logger.add(
    new TelegramLogger({
      token: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.DEV_CHAT_ID,
      level: "verbose",
      formatMessage: function (options, { level, message, ID, timestamp }) {
        // Return different format for verbose
        return `${timestamp} [${ID || "-"}] ${level}: ${message}`;
      },
    })
  );
}

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      // Return different format for verbose
      format: printf(({ level, message, ID, timestamp }) => {
        return `${colors.green(timestamp)} [${
          ID ? colors.cyan(ID) : "-"
        }] ${colors.blue.bgBrightWhite(level)}: ${message}`;
      }),
    })
  );
}

// Behaviour of telegram logger just seems so inconsistent with the actual behaviour of other default Winston loggers...please
// fix?
// Am forced to create a whole separate logger here because telegram winston lacks the ability to filter logs in its formatMessage
// function.
// What the? Seems like winston telegram doesn't even maintain the proper order of messages
let humanLogger;
if (process.env.NODE_ENV === "production") {
  humanLogger = createLogger({
    level: "info",
    format: combine(
      timestamp(),
      format((info, opts) => {
        if (!info.human) return false;
        return info;
      })()
    ),
  });

  // Only log to official donation tracking Telegram chat group in production
  humanLogger.add(
    new TelegramLogger({
      token: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.GVH_TEAM_CHAT_ID,
      formatMessage: function (options, { message, timestamp }) {
        return `[${timestamp}] ${message}`;
      },
    })
  );
}

function comLogger(level, ...args) {
  humanLogger && humanLogger[level](...args);
  logger[level](...args);
}

module.exports = comLogger;
