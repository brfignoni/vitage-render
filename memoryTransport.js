/**
 * MemoryTransport is a custom Winston transport that stores logs in memory.
 * It captures logs at the levels 'error', 'warn', and 'info' along with their timestamps,
 * and optionally a stack trace if available.
 *
 * @module MemoryTransport
 */

const Transport = require("winston-transport");

class MemoryTransport extends Transport {
  /**
   * Creates an instance of MemoryTransport.
   *
   * @param {Object} opts - Options for the transport.
   */
  constructor(opts) {
    super(opts);
    /**
     * Array to store log objects.
     * @type {Array<Object>}
     */
    this.logs = [];
  }

  /**
   * Clears all stored logs.
   *
   * This method resets the internal logs array.
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Retrieves all stored logs.
   *
   * @returns {Array<Object>} The array of stored logs.
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Logs the given information.
   *
   * This function is called by Winston to log messages. It asynchronously
   * emits a 'logged' event and stores the log if its level is 'error', 'warn', or 'info'.
   *
   * @param {Object} info - The log information, which includes:
   *   - level: The log level (e.g., 'error', 'warn', 'info').
   *   - message: The log message.
   *   - timestamp: (Optional) A timestamp for the log entry.
   *   - stack: (Optional) A stack trace if available.
   * @param {Function} callback - A callback to signal completion.
   */
  log(info, callback) {
    // Asynchronously emit the 'logged' event.
    setImmediate(() => {
      this.emit("logged", info);
    });

    // Store logs only for error, warn, and info levels.
    if (
      info.level === "error" ||
      info.level === "warn" ||
      info.level === "info"
    ) {
      // Build the log entry with a timestamp and optional stack trace.
      const logEntry = {
        level: info.level,
        message: info.message,
        timestamp: info.timestamp || new Date().toISOString(),
        ...(info.stack && { stack: info.stack }), // Include stack if available.
      };

      this.logs.push(logEntry);
    }

    // Notify Winston that the logging is complete.
    callback();
  }
}

module.exports = MemoryTransport;
