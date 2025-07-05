/**
 * Winston Logger Configuration Module
 *
 * This module sets up a Winston logger with:
 * - A custom in-memory transport for storing logs.
 * - A console transport for outputting logs to the terminal.
 * - A formatting scheme that includes timestamps, error stack traces, and a custom log layout.
 *
 * The configured logger and the memory transport instance are exported for use in other parts of the application.
 */

const { createLogger, format, transports } = require("winston");
const MemoryTransport = require("./memoryTransport"); // Adjust the path according to your folder structure

// -----------------------------------------------------------------------------
// memoryTransport Instance
// -----------------------------------------------------------------------------
/**
 * Create an instance of the custom in-memory transport.
 * This transport is used to store log events in memory.
 */
const memoryTransport = new MemoryTransport();

// -----------------------------------------------------------------------------
// Common Log Format
// -----------------------------------------------------------------------------
/**
 * Define a common log format function.
 *
 * This function returns a formatted log string containing the timestamp, log level,
 * and either the error stack trace (if available) or the log message.
 */
const logFormat = format.printf(({ timestamp, level, message, stack }) => {
  // If a stack trace is available (typically for errors), show it; otherwise, show the message.
  return `${timestamp} [${level}]: ${stack || message}`;
});

// -----------------------------------------------------------------------------
// Winston Logger Configuration
// -----------------------------------------------------------------------------
/**
 * Create and configure the Winston logger instance.
 *
 * The logger is set to record logs at the 'info' level and above. It uses a combined format
 * that includes a timestamp, error stack traces, and the custom log format defined above.
 * Two transports are configured:
 *  - A console transport with colorized output.
 *  - The custom in-memory transport.
 *
 * The logger is also configured to not exit the process on handled exceptions.
 */
const logger = createLogger({
  level: "info", // Minimum log level to record
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }), // Enable capturing of stack traces for errors
    logFormat
  ),
  transports: [
    // Console transport for logging to the terminal (with colorization)
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
    }),
    // Custom in-memory transport for storing logs
    memoryTransport,
  ],
  exitOnError: false, // Prevent the application from exiting on handled exceptions
});

// -----------------------------------------------------------------------------
// Module Exports
// -----------------------------------------------------------------------------
/**
 * Export both the logger and the memory transport for external use.
 */
module.exports = { logger, memoryTransport };
