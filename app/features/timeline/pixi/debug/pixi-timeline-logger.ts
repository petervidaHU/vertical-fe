/**
 * Loosely-coupled debugging logger for PixiJS Timeline
 * 
 * This logger is designed to be easily removed from production code.
 * All logging is opt-in and can be disabled by setting DEBUG_ENABLED = false.
 * 
 * Usage:
 *   import { timelineLogger } from './debug/pixi-timeline-logger';
 *   timelineLogger.logMovement('story-123', { x: 100, y: 200, scale: 1.5 });
 */

// Set this to false to disable all logging (for production)
const DEBUG_ENABLED = false;

interface LogEntry {
  timestamp: number;
  type: string;
  storyId?: string;
  data: unknown;
}

class PixiTimelineLogger {
  private logs: LogEntry[] = [];
  private enabled: boolean = DEBUG_ENABLED;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      console.log('[PIXI Timeline Logger] Enabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private addLog(type: string, storyId: string | undefined, data: unknown): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: performance.now(),
      type,
      storyId,
      data,
    };

    this.logs.push(entry);

    // Keep only last 1000 logs to avoid memory bloat
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  logMovement(storyId: string, movement: { x?: number; y?: number; scale?: number; alpha?: number; rotation?: number }): void {
    this.addLog('MOVEMENT', storyId, movement);
  }

  logHover(storyId: string, hoverAmount: number): void {
    this.addLog('HOVER', storyId, { hoverAmount });
  }

  logAltitudeChange(altitude: number, targetAltitude: number): void {
    this.addLog('ALTITUDE', undefined, { current: altitude, target: targetAltitude });
  }

  logImageLoad(storyId: string, imageUrl: string, success: boolean): void {
    this.addLog('IMAGE_LOAD', storyId, { imageUrl, success });
  }

  logEvent(storyId: string, eventType: string, data?: unknown): void {
    this.addLog(`EVENT_${eventType.toUpperCase()}`, storyId, data);
  }

  /**
   * Get all logs as a formatted string for easy copy-paste
   */
  exportLogs(): string {
    const grouped = this.logs.reduce(
      (acc, log) => {
        const key = log.storyId || 'GLOBAL';
        if (!acc[key]) acc[key] = [];
        acc[key].push(log);
        return acc;
      },
      {} as Record<string, LogEntry[]>,
    );

    let output = '=== PIXI Timeline Debug Logs ===\n\n';

    Object.entries(grouped).forEach(([storyId, storyLogs]) => {
      output += `\n--- ${storyId} ---\n`;
      storyLogs.forEach((log) => {
        output += `[${log.timestamp.toFixed(2)}ms] ${log.type}: ${JSON.stringify(log.data)}\n`;
      });
    });

    return output;
  }

  /**
   * Copy logs to clipboard automatically
   */
  copyLogsToClipboard(): void {
    const logs = this.exportLogs();
    navigator.clipboard.writeText(logs).then(
      () => console.log('[PIXI Timeline Logger] Logs copied to clipboard'),
      (err) => console.error('[PIXI Timeline Logger] Failed to copy logs:', err),
    );
  }

  /**
   * Log to console and clipboard
   */
  dumpLogs(): void {
    const logs = this.exportLogs();
    console.log(logs);
    this.copyLogsToClipboard();
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLogCount(): number {
    return this.logs.length;
  }
}

// Export singleton instance
export const timelineLogger = new PixiTimelineLogger();

// Expose to global for easy access in browser console
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__PIXI_TIMELINE_LOGGER__ = timelineLogger;
}
